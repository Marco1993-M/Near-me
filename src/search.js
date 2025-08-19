import { getMapInstance } from './map.js';
import { showFloatingCard } from './shops.js';
import { getOrCreateShop } from './db.js';
import supabase from './supabase.js';


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

export function initSearch() {
  console.log('Initializing search...');

  if (!google?.maps?.places) {
    console.error('Google Maps API is not loaded');
    searchInput = document.getElementById('search-bar');
    if (searchInput) {
      searchInput.disabled = true;
      searchInput.placeholder = 'Search unavailable';
    }
    return;
  }

  searchInput = document.getElementById('search-bar');
  searchDropdown = document.getElementById('search-dropdown');

  if (!searchInput || !searchDropdown) {
    console.error('Search elements not found');
    return;
  }

  const mapInstance = getMapInstance();
  if (!mapInstance) {
    console.error('Map instance is not available.');
    return;
  }

  // --- Input handler (debounced) ---
  searchInput.addEventListener(
    'input',
    debounce(async (e) => {
      const searchQuery = e.target.value.trim();
      if (!searchQuery) {
        // Reset map to default state showing all shops
        await resetMapToAllShops();
        searchDropdown.classList.add('hidden');
        searchDropdown.innerHTML = '';
        return;
      }

      try {
        const { cities, shops, roasters } = await performUnifiedSearch(searchQuery);
        renderSearchResults({ cities, shops, roasters }, searchDropdown);
      } catch (error) {
        console.error('Search error:', error);
        searchDropdown.classList.add('hidden');
      }
    }, 300)
  );

  // --- Enter key handler ---
  searchInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const query = searchInput.value.trim();
    if (!query) return;

    try {
      const didHandleAsCity = await tryHandleAsCity(query);
      if (didHandleAsCity) {
        searchDropdown.classList.add('hidden');
        return;
      }

      const { shops, roasters } = await performUnifiedSearch(query);
      const combinedResults = [...shops, ...roasters];
      await displaySearchResults(combinedResults, getMapInstance());
      searchDropdown.classList.add('hidden');
    } catch (error) {
      console.error('Text search error:', error);
      searchDropdown.classList.add('hidden');
    }
  });

  // --- Click listener for dropdown ---
  searchDropdown.addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-type]');
    if (!li) return;

    const type = li.dataset.type;
    const shopId = li.dataset.shopId;
    const placeId = li.dataset.placeId;

    if (type === 'city') {
      try {
        const result = await geocodePlaceId(placeId);
        await centerMapOnCity(result);
        searchDropdown.classList.add('hidden');
      } catch (err) {
        console.error('City geocode failed', err);
      }
      return;
    }

    if (type === 'shop') {
      try {
        const place = await getPlaceDetails(placeId);
        const shop = {
          name: place.name,
          formatted_address: place.formatted_address,
          geometry: place.geometry,
          address_components: place.address_components,
          formatted_phone_number: place.formatted_phone_number
        };
        await focusShopOnMap(shop);
        searchDropdown.classList.add('hidden');
      } catch (err) {
        console.error('Shop click failed', err);
      }
      return;
    }

if (type === 'roaster') {
  try {
    // Get the selected roaster name from the dataset
    const roasterName = li.dataset.roasterName.toLowerCase();

    // Fetch all shops from Supabase with a non-null roasters column
    const { data: allShops, error } = await supabase
      .from('shops')
      .select('*')
      .not('roasters', 'is', null);

    if (error) throw error;

    // Filter shops that include the selected roaster
    const filteredShops = allShops.filter(shop =>
      Array.isArray(shop.roasters)
        ? shop.roasters.some(r => r.toLowerCase() === roasterName)
        : shop.roasters.toLowerCase() === roasterName
    );

    // Collect IDs of filtered shops for highlighting
    const highlightIds = filteredShops.map(s => s.id);

    // Display all shops, highlighting only the filtered ones
    await displayShopsOnMap(allShops, highlightIds);

    // Hide the dropdown
    searchDropdown.classList.add('hidden');
  } catch (err) {
    console.error('Roaster click failed', err);
  }
  return;
}


  });
}

/* -------------------- Unified Search -------------------- */
async function performUnifiedSearch(query) {
  query = query.trim().toLowerCase();
  if (!query) return { cities: [], shops: [], roasters: [] };

  // --- Google Places: shops ---
  const places = await getPlacePredictionsGrouped(query);
  const shops = Array.isArray(places.places) ? places.places : [];

  // --- Supabase: roasters only ---
  let roasterData = [];
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('roasters')   // only fetch roaster column
      .not('roasters', 'is', null);

    if (error) throw error;

    if (data && data.length > 0) {
      // Flatten in case roasters is an array
      const allRoasters = data.flatMap(r =>
        Array.isArray(r.roasters) ? r.roasters : [r.roasters]
      );

      // Deduplicate
      let uniqueRoasters = [...new Set(allRoasters)];

      // Partial word matching
      roasterData = uniqueRoasters.filter(r => {
        const words = r.toLowerCase().split(/\s+/);
        return words.some(word => word.includes(query));
      });

      // Relevance sort: roasters starting with query appear first
      roasterData.sort((a, b) => {
        const aq = a.toLowerCase();
        const bq = b.toLowerCase();
        if (aq.startsWith(query) && !bq.startsWith(query)) return -1;
        if (!aq.startsWith(query) && bq.startsWith(query)) return 1;
        return 0;
      });
    }
  } catch (err) {
    console.error('Roaster search error:', err);
  }

  const cities = Array.isArray(places.cities) ? places.cities : [];

  return { cities, shops, roasters: roasterData };
}



/* -------------------- Helpers -------------------- */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

async function getPlacePredictionsGrouped(query) {
  autocompleteService = autocompleteService || new google.maps.places.AutocompleteService();
  const mapInstance = getMapInstance();
  const userLatLng = mapInstance?.map?.getCenter();
  const baseNearbyOpts = userLatLng
    ? { location: new google.maps.LatLng(userLatLng.lat, userLatLng.lng), radius: 50000 }
    : {};

  const citiesPromise = new Promise(resolve =>
    autocompleteService.getPlacePredictions(
      { input: query, types: ['(cities)'], ...baseNearbyOpts },
      (predictions, status) => resolve(status === 'OK' ? predictions : [])
    )
  );

  const placesPromise = new Promise(resolve =>
    autocompleteService.getPlacePredictions(
      { input: query, types: ['establishment', 'geocode'], ...baseNearbyOpts },
      (predictions, status) => resolve(status === 'OK' ? predictions : [])
    )
  );

  const [cities, places] = await Promise.all([citiesPromise, placesPromise]);
  return { cities: cities || [], places: places || [] };
}

function renderSearchResults({ cities, shops, roasters }, dropdown) {
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
      if (type === 'roaster') {
        li.textContent = item;                // roaster name only
        li.dataset.roasterName = item;        // store clean roaster
      } else {
        li.textContent = item.description;    // Google Places result
        li.dataset.placeId = item.place_id;
      }
      li.dataset.type = type;
      li.className = `search-result search-result-${type}`;
      fragment.appendChild(li);
    });
  }

  appendSection('Cities', cities, 'city');
  appendSection('Shops', shops, 'shop');
  appendSection('Roasters', roasters, 'roaster');

  if (fragment.childNodes.length > 0) {
    dropdown.appendChild(fragment);
    dropdown.classList.remove('hidden');
  } else {
    dropdown.classList.add('hidden');
  }
}


// --- City handling ---
async function tryHandleAsCity(query) {
  const { cities } = await getPlacePredictionsGrouped(query);
  if (!cities.length) return false;

  try {
    const result = await geocodePlaceId(cities[0].place_id);
    if (result?.types?.some(t => CITY_TYPES.has(t))) {
      await centerMapOnCity(result);
      return true;
    }
  } catch (e) {
    console.warn('Failed to center on city.', e);
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

// --- Display shops with highlighted markers ---
async function displayShopsOnMap(shops, highlightIds = []) {
  const { map } = getMapInstance();
  if (!map) return;

  // Remove existing markers
  currentMarkers.forEach(marker => map.removeLayer(marker));
  currentMarkers = [];

  let firstHighlighted = null;

  for (const s of shops) {
    const lat = s.lat;
    const lng = s.lng;
    const isHighlight = highlightIds.includes(s.id);

    const marker = L.marker([lat, lng], {
      icon: isHighlight ? customRoasterPngIcon : customPngIcon,
      opacity: isHighlight ? 1 : 0.5 // optional dimming for non-highlighted
    }).addTo(map)
      .bindPopup(s.name);

    marker._shopId = s.id;

    // Open popup later for first highlighted shop
    if (isHighlight && !firstHighlighted) firstHighlighted = marker;

    marker.on('click', () => showFloatingCard(s));

    currentMarkers.push(marker);
  }

  // Center map and open popup for first highlighted marker if exists
  if (firstHighlighted) {
    map.setView(firstHighlighted.getLatLng(), 14);
    firstHighlighted.openPopup();
  } else if (shops.length > 0) {
    const first = shops[0];
    map.setView([first.lat, first.lng], 13);
  }
}



// --- Reset map to all shops ---
async function resetMapToAllShops() {
  const { data: allShops, error } = await supabase.from('shops').select('*');
  if (error) {
    console.error('Failed to fetch all shops:', error);
    return;
  }
  await displayShopsOnMap(allShops);
}

// --- Focus single shop ---
async function focusShopOnMap(place) {
  const { map, customIcon } = getMapInstance();
  if (!map) return;

  currentMarkers.forEach(marker => map.removeLayer(marker));
  currentMarkers = [];

  const lat = place.geometry.location.lat();
  const lng = place.geometry.location.lng();

  const marker = L.marker([lat, lng], { icon: customIcon })
    .addTo(map)
    .bindPopup(place.name)
    .openPopup();

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
}

function extractCityFromAddressComponents(components) {
  if (!components) return 'Unknown City';
  const cityComponent = components.find(c =>
    c.types.includes('locality') || c.types.includes('administrative_area_level_2')
  );
  return cityComponent ? cityComponent.long_name.toLowerCase() : 'Unknown City';
}
