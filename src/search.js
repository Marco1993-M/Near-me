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

  // Debounced input handler
  searchInput.addEventListener(
    'input',
    debounce(async (e) => {
      const searchQuery = e.target.value.trim();
      if (!searchQuery) {
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

  // Enter key
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

    if (type === 'shop' || type === 'roaster') {
      try {
        let shop;
        if (type === 'shop') {
          const place = await getPlaceDetails(placeId);
          shop = {
            name: place.name,
            formatted_address: place.formatted_address,
            geometry: place.geometry,
            address_components: place.address_components,
            formatted_phone_number: place.formatted_phone_number
          };
        } else if (type === 'roaster') {
          const { data, error } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .single();

          if (error || !data) {
            console.error('Roaster shop lookup failed', error);
            return;
          }

          shop = {
            name: data.name,
            formatted_address: data.address,
            geometry: { location: { lat: () => data.lat, lng: () => data.lng } },
            address_components: [],
            formatted_phone_number: data.phone
          };
        }

        await focusShopOnMap(shop);
        searchDropdown.classList.add('hidden');
      } catch (error) {
        console.error('Error handling shop/roaster click:', error);
      }
      return;
    }
  });
}

/* -------------------- Unified Search -------------------- */
async function performUnifiedSearch(query) {
  query = query.trim();
  if (!query) return { cities: [], shops: [], roasters: [] };

  // --- Google Places: shops ---
  const places = await getPlacePredictionsGrouped(query);
  const shops = Array.isArray(places.places) ? places.places : [];

  // --- Supabase: roasters only ---
  let roasterData = [];
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .not('roasters', 'is', null); // only rows with roasters

    if (error) throw error;

    if (data && data.length > 0) {
      const q = query.toLowerCase();
      roasterData = data.filter(r =>
        (Array.isArray(r.roasters) && r.roasters.some(x => x.toLowerCase().includes(q))) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.city && r.city.toLowerCase().includes(q))
      );
    }
  } catch (err) {
    console.error('Roaster search error:', err);
  }

  // --- Cities from Google Places ---
  const cities = Array.isArray(places.cities) ? places.cities : [];

  return {
    cities,
    shops,
    roasters: roasterData
  };
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

  const citiesPromise = new Promise((resolve) => {
    autocompleteService.getPlacePredictions(
      { input: query, types: ['(cities)'], ...baseNearbyOpts },
      (predictions, status) => resolve(status === 'OK' ? predictions : [])
    );
  });

  const placesPromise = new Promise((resolve) => {
    autocompleteService.getPlacePredictions(
      { input: query, types: ['establishment', 'geocode'], ...baseNearbyOpts },
      (predictions, status) => resolve(status === 'OK' ? predictions : [])
    );
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
    if (result?.types?.some((t) => CITY_TYPES.has(t))) {
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

  currentMarkers.forEach((m) => map.removeLayer(m));
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

  console.log(`Centered on ${geoResult.formatted_address}`);
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

  currentMarkers.forEach((marker) => map.removeLayer(marker));
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
  const cityComponent = components.find((c) =>
    c.types.includes('locality') || c.types.includes('administrative_area_level_2')
  );
  return cityComponent ? cityComponent.long_name.toLowerCase() : 'Unknown City';
}

async function displaySearchResults(results, mapInstance) {
  const map = mapInstance.map;
  const coffeeIcon = mapInstance.customIcon;

  currentMarkers.forEach((marker) => map.removeLayer(marker));
  currentMarkers = [];

  for (const place of results) {
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const marker = L.marker([lat, lng], { icon: coffeeIcon })
      .addTo(map)
      .bindPopup(place.name);
    currentMarkers.push(marker);

    const shop = {
      name: place.name,
      address: place.formatted_address,
      lat,
      lng,
      city: extractCityFromAddressComponents(place.address_components) || 'Unknown',
      phone: place.formatted_phone_number || null
    };

    shop.id = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
    marker._shopId = shop.id;
    marker.on('click', () => showFloatingCard(shop));
  }

  if (results.length > 0) {
    map.setView([results[0].geometry.location.lat(), results[0].geometry.location.lng()], 13);
  }
}
