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
  if (!searchInput || !searchDropdown) return;

  const mapInstance = getMapInstance();
  if (!mapInstance) return;

  // Debounced input handler
  searchInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    if (!query) {
      searchDropdown.classList.add('hidden');
      searchDropdown.innerHTML = '';
      resetMapToAllShops();
      return;
    }
    try {
      const { cities, shops, roasters } = await performUnifiedSearch(query);
      renderSearchResults({ cities, shops, roasters }, searchDropdown);
    } catch (err) {
      console.error('Search error:', err);
      searchDropdown.classList.add('hidden');
    }
  }, 300));

  // Enter key handler
  searchInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const query = searchInput.value.trim();
    if (!query) {
      resetMapToAllShops();
      return;
    }

    try {
      const didHandleAsCity = await tryHandleAsCity(query);
      if (didHandleAsCity) {
        searchDropdown.classList.add('hidden');
        return;
      }

      const { shops, roasters } = await performUnifiedSearch(query);
      const combinedResults = [...shops, ...roasters];
      await displayShopsOnMap(combinedResults);
      searchDropdown.classList.add('hidden');
    } catch (err) {
      console.error('Enter key search error:', err);
    }
  });

  // Delegated click listener
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
        const roasterName = li.textContent.replace(/\(.*\)/, '').trim();
        const { data: roasterShops, error } = await supabase
          .from('shops')
          .select('*')
          .not('roasters', 'is', null)
          .ilike('roasters', `%${roasterName}%`);
        if (error) throw error;

        await displayShopsOnMap(roasterShops);
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
  query = query.trim();
  if (!query) return { cities: [], shops: [], roasters: [] };

  // Google Places
  const places = await getPlacePredictionsGrouped(query);
  const shops = Array.isArray(places.places) ? places.places : [];
  const cities = Array.isArray(places.cities) ? places.cities : [];

  // Supabase roasters only
  let roasterData = [];
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .not('roasters', 'is', null)
      .ilike('roasters', `%${query}%`);
    if (error) throw error;
    roasterData = data || [];
  } catch (err) {
    console.error('Roaster search error:', err);
  }

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

  const baseOpts = userLatLng ? { location: new google.maps.LatLng(userLatLng.lat, userLatLng.lng), radius: 50000 } : {};

  const citiesPromise = new Promise(resolve => {
    autocompleteService.getPlacePredictions({ input: query, types: ['(cities)'], ...baseOpts },
      (predictions, status) => resolve(status === 'OK' ? predictions : []));
  });

  const placesPromise = new Promise(resolve => {
    autocompleteService.getPlacePredictions({ input: query, types: ['establishment', 'geocode'], ...baseOpts },
      (predictions, status) => resolve(status === 'OK' ? predictions : []));
  });

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
        li.textContent = `${item.name} (${item.city || ''})`;
        li.dataset.shopId = item.id;
      } else {
        li.textContent = item.description;
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

async function tryHandleAsCity(query) {
  const { cities } = await getPlacePredictionsGrouped(query);
  if (!cities.length) return false;

  try {
    const result = await geocodePlaceId(cities[0].place_id);
    if (result?.types?.some(t => CITY_TYPES.has(t))) {
      await centerMapOnCity(result);
      return true;
    }
  } catch (err) {
    console.warn('Failed to center on city.', err);
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
    map.setView([geoResult.geometry.location.lat(), geoResult.geometry.location.lng()], 11);
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
  const cityComponent = components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
  return cityComponent ? cityComponent.long_name.toLowerCase() : 'Unknown City';
}

/* -------------------- Display shops on map -------------------- */
async function displayShopsOnMap(shops) {
  const { map, customIcon } = getMapInstance();
  if (!map) return;

  currentMarkers.forEach(marker => {
    if (marker && map.hasLayer(marker)) map.removeLayer(marker);
  });
  currentMarkers = [];

  for (const s of shops) {
    const lat = s.lat;
    const lng = s.lng;
    if (lat == null || lng == null) continue;

    const marker = L.marker([lat, lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(s.name);

    currentMarkers.push(marker);

    marker._shopId = s.id;
    marker.on('click', () => showFloatingCard(s));
  }

  if (shops.length > 0) {
    map.setView([shops[0].lat, shops[0].lng], 13);
  }
}

/* -------------------- Reset map to all shops -------------------- */
async function resetMapToAllShops() {
  try {
    const { data: allShops, error } = await supabase.from('shops').select('*');
    if (error) throw error;
    await displayShopsOnMap(allShops);
  } catch (err) {
    console.error('Failed to fetch all shops:', err);
  }
}
