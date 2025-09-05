import { getMapInstance } from './map.js';
import { showFloatingCard } from './shops.js';
import { getOrCreateShop } from './db.js';
import supabase from './supabase.js';
import { customPngIcon, customRoasterPngIcon } from './map.js';
import { showToast } from './ui.js';

let searchInput;
let searchDropdown;
let autocompleteService;
let placesService;
let geocoder;
let currentMarkers = [];

const CITY_TYPES = new Set([
  'locality',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'sublocality',
  'country'
]);

/* -------------------- INIT SEARCH -------------------- */
export function initSearch() {
  console.log('Initializing search...');

  searchInput = document.getElementById('search-bar');
  searchDropdown = document.getElementById('search-dropdown');

  if (!searchInput || !searchDropdown || !google?.maps?.places) {
    console.error('Search initialization failed.');
    if (searchInput) {
      searchInput.disabled = true;
      searchInput.placeholder = 'Search unavailable';
    }
    return;
  }

  const mapInstance = getMapInstance();
  if (!mapInstance) {
    console.error('Map instance not found');
    return;
  }

  // --- Input handler (debounced) ---
  searchInput.addEventListener(
    'input',
    debounce(async (e) => {
      const query = e.target.value.trim();
      if (!query) {
        await resetMapToAllShops();
        searchDropdown.classList.add('hidden');
        searchDropdown.innerHTML = '';
        return;
      }

      try {
        const { shops, cities, roasters } = await performUnifiedSearch(query, mapInstance.map.getCenter());
        renderSearchResults({ shops, cities, roasters }, searchDropdown);
      } catch (err) {
        console.error('Search error:', err);
        searchDropdown.classList.add('hidden');
      }
    }, 300)
  );

  // --- Enter key handler ---
  searchDropdown.addEventListener('click', async (e) => {
  const li = e.target.closest('li[data-type]');
  if (!li) return;

  const type = li.dataset.type;
  const placeId = li.dataset.placeId;
  const roasterName = li.dataset.roasterName;

  // **Hide dropdown immediately**
  searchDropdown.classList.add('hidden');

  try {
    if (type === 'city') {
      if (!placeId) return console.warn('City missing placeId');
      const geo = await geocodePlaceId(placeId);
      await centerMapOnCity(geo);
    }

    if (type === 'shop') {
      if (!placeId) return console.warn('Shop missing placeId');
      const place = await getPlaceDetails(placeId);
      await focusShopOnMap(place);
    }

    if (type === 'roaster') {
      if (!roasterName) return console.warn('Roaster missing name');
      const { data: allShops, error } = await supabase
        .from('shops')
        .select('*')
        .not('roasters', 'is', null);

      if (error) throw error;

      const filteredShops = allShops.filter(s =>
        Array.isArray(s.roasters)
          ? s.roasters.some(r => r.toLowerCase() === roasterName.toLowerCase())
          : s.roasters.toLowerCase() === roasterName.toLowerCase()
      );

      const highlightIds = filteredShops.map(s => s.id);
      await displayShopsOnMap(allShops, highlightIds);
    }
  } catch (err) {
    console.error(`${type} click failed`, err);
  }
});

}

/* -------------------- UNIFIED SEARCH -------------------- */
async function performUnifiedSearch(query, userLocation) {
  query = query.toLowerCase();
  const { cities, places } = await getPlacePredictionsGrouped(query, userLocation);

  // --- Shops (Google Places)
  const shops = places.map(p => ({
    name: p.description,
    place_id: p.place_id,
    type: 'shop'
  }));

  // --- Roasters (Supabase)
  let roasters = [];
  try {
    const { data, error } = await supabase.from('shops').select('roasters').not('roasters', 'is', null);
    if (!error && data) {
      const allRoasters = data.flatMap(s => Array.isArray(s.roasters) ? s.roasters : [s.roasters]);
      const uniqueRoasters = [...new Set(allRoasters)];
      roasters = uniqueRoasters.filter(r => r.toLowerCase().includes(query)).map(r => ({ name: r, type: 'roaster' }));
    }
  } catch (err) {
    console.error('Roaster search error:', err);
  }

  return { cities, shops, roasters };
}

/* -------------------- GOOGLE PLACES PREDICTIONS -------------------- */
async function getPlacePredictionsGrouped(query, userLocation) {
  autocompleteService = autocompleteService || new google.maps.places.AutocompleteService();

  const baseOpts = userLocation
    ? { location: new google.maps.LatLng(userLocation.lat, userLocation.lng), radius: 50000 }
    : {};

  const citiesPromise = new Promise(resolve =>
    autocompleteService.getPlacePredictions({ input: query, types: ['(cities)'], ...baseOpts }, (predictions, status) => resolve(status === 'OK' ? predictions : []))
  );

  const placesPromise = new Promise(resolve =>
    autocompleteService.getPlacePredictions({ input: query, types: ['establishment'], ...baseOpts }, (predictions, status) => resolve(status === 'OK' ? predictions : []))
  );

  const [cities, places] = await Promise.all([citiesPromise, placesPromise]);
  return { cities: cities || [], places: places || [] };
}

/* -------------------- SCORING & SORTING -------------------- */
function getItemText(item) {
  if (item._type === 'roaster') return item.name || '';
  if (item._type === 'shop') return item.name || item.description || '';
  if (item._type === 'city') return item.description || item.name || (item.structured_formatting?.main_text) || '';
  return '';
}

function scoreResult(result, query, userLocation) {
  let score = 0;
  const name = getItemText(result).toLowerCase();
  query = query.toLowerCase();

  if (name === query) score += 100;
  else if (name.includes(query)) score += 50;

  if (result._type === 'shop' && result.lat && result.lng && userLocation) {
    const dist = getDistanceKm(userLocation, { lat: result.lat, lng: result.lng });
    score += Math.max(0, 50 - dist); // closer shops get more points
  }

  if (result._type === 'shop') score += 50;
  if (result._type === 'roaster') score += 30;
  if (result._type === 'city') score += 10;

  return score;
}

function sortAndRenderResults(results, dropdown, userLocation) {
  const query = searchInput.value.trim().toLowerCase();

  // Add internal _type for safety
  const allResults = results.map(r => {
    if (typeof r === 'string') return { name: r, _type: 'roaster' };
    return { ...r, _type: r.type || 'shop' };
  });

  allResults.sort((a, b) => scoreResult(b, query, userLocation) - scoreResult(a, query, userLocation));

  // Separate by type after scoring for consistent order: Shops -> Roasters -> Cities
  const shops = allResults.filter(r => r._type === 'shop');
  const roasters = allResults.filter(r => r._type === 'roaster');
  const cities = allResults.filter(r => r._type === 'city');

  renderSearchResults({ shops, roasters, cities }, dropdown);
}

/* -------------------- RENDER -------------------- */
function renderSearchResults({ shops, roasters, cities }, dropdown) {
  dropdown.innerHTML = '';
  const fragment = document.createDocumentFragment();

  function appendSection(title, items, type) {
    if (!items || items.length === 0) return;

    const header = document.createElement('li');
    header.className = 'search-section-header';
    header.textContent = title;
    header.style.borderLeft = '4px solid green';
    header.style.paddingLeft = '8px';
    header.style.marginTop = '6px';
    header.style.marginBottom = '2px';
    fragment.appendChild(header);

    items.forEach(item => {
      const li = document.createElement('li');
      li.dataset.type = type;
      li.className = `search-result search-result-${type}`;

      if (type === 'roaster') {
        li.textContent = item.name || item;  // string fallback
        li.dataset.roasterName = item.name || item;
      } else if (type === 'shop') {
        li.textContent = item.name || item.description || '';
        li.dataset.placeId = item.place_id;
      } else if (type === 'city') {
        li.textContent = item.description || item.name || (item.structured_formatting?.main_text) || '';
        li.dataset.placeId = item.place_id;
      }

      fragment.appendChild(li);
    });
  }

  appendSection('Shops', shops, 'shop');
  appendSection('Roasters', roasters, 'roaster');
  appendSection('Cities', cities, 'city');

  if (fragment.childNodes.length > 0) {
    dropdown.appendChild(fragment);
    dropdown.classList.remove('hidden');
  } else {
    dropdown.classList.add('hidden');
  }
}



/* -------------------- UTILITIES -------------------- */
function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

/* -------------------- CITY HANDLING -------------------- */
async function tryHandleAsCity(query) {
  const { cities } = await getPlacePredictionsGrouped(query);
  if (!cities.length) return false;

  try {
    const geoResult = await geocodePlaceId(cities[0].place_id);
    if (geoResult?.types?.some(t => CITY_TYPES.has(t))) {
      await centerMapOnCity(geoResult);
      return true;
    }
  } catch (err) {
    console.warn('Failed to center on city', err);
  }
  return false;
}

async function geocodePlaceId(placeId) {
  geocoder = geocoder || new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ placeId }, (results, status) => {
      if (status === 'OK' && results && results[0]) resolve(results[0]);
      else reject(status);
    });
  });
}

async function centerMapOnCity(geoResult) {
  const { map } = getMapInstance();
  if (!map || !geoResult) return;

  currentMarkers.forEach(m => map.removeLayer(m));
  currentMarkers = [];

  const viewport = geoResult.geometry.viewport;
  if (viewport) {
    const sw = [viewport.getSouthWest().lat(), viewport.getSouthWest().lng()];
    const ne = [viewport.getNorthEast().lat(), viewport.getNorthEast().lng()];
    map.fitBounds([sw, ne]);
  } else {
    const lat = geoResult.geometry.location.lat();
    const lng = geoResult.geometry.location.lng();
    map.setView([lat, lng], 11);
  }
}

async function getPlaceDetails(placeId) {
  placesService = placesService || new google.maps.places.PlacesService(document.createElement('div'));
  return new Promise((resolve, reject) => {
    placesService.getDetails({ placeId }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) resolve(place);
      else reject(status);
    });
  });
}

/* -------------------- SHOPS ON MAP -------------------- */
async function displayShopsOnMap(shops, highlightIds = []) {
  const { map } = getMapInstance();
  if (!map) return;

  currentMarkers.forEach(m => map.removeLayer(m));
  currentMarkers = [];

  let firstHighlighted = null;

  for (const s of shops) {
    const lat = s.lat;
    const lng = s.lng;
    const isHighlight = highlightIds.includes(s.id);

    const marker = L.marker([lat, lng], {
      icon: isHighlight ? customRoasterPngIcon : customPngIcon,
      opacity: isHighlight ? 1 : 0.5
    }).addTo(map).bindPopup(s.name);

    marker._shopId = s.id;

    if (isHighlight && !firstHighlighted) firstHighlighted = marker;

    marker.on('click', () => showFloatingCard(s));

    currentMarkers.push(marker);
  }

  if (firstHighlighted) {
    map.setView(firstHighlighted.getLatLng(), 14);
    firstHighlighted.openPopup();
  } else if (shops.length) {
    const first = shops[0];
    map.setView([first.lat, first.lng], 13);
  }
}

async function resetMapToAllShops() {
  const { data: allShops, error } = await supabase.from('shops').select('*');
  if (error) return console.error('Failed to fetch all shops', error);
  await displayShopsOnMap(allShops);
}

async function focusShopOnMap(place) {
  const { map, customIcon } = getMapInstance();
  if (!map) return;

  currentMarkers.forEach(m => map.removeLayer(m));
  currentMarkers = [];

  const lat = place.geometry.location.lat();
  const lng = place.geometry.location.lng();

  const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map).bindPopup(place.name).openPopup();
  currentMarkers.push(marker);

  map.setView([lat, lng], 15);

  const shop = {
    name: place.name,
    address: place.formatted_address,
    lat,
    lng,
    city: place.address_components ? extractCityFromAddressComponents(place.address_components) : 'Unknown',
    phone: place.formatted_phone_number || null
  };

  shop.id = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
  await showFloatingCard(shop);

    // **SHOW TOAST FOR SEARCH RESULT**
  showToast({ category: "search", type: "info", duration: 5000 });
}

function extractCityFromAddressComponents(components) {
  if (!components) return 'Unknown City';
  const cityComponent = components.find(c =>
    c.types.includes('locality') || c.types.includes('administrative_area_level_2')
  );
  return cityComponent ? cityComponent.long_name.toLowerCase() : 'Unknown City';
}
