import { getMapInstance } from './map.js';
import { showFloatingCard } from './shops.js';
import { getOrCreateShop } from './db.js';

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

export function initSearch(supabase) {
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
        const { cities, places } = await getPlacePredictionsGrouped(searchQuery);
        renderSearchResults({ cities, places }, searchDropdown);
      } catch (error) {
        console.error('Error searching places:', error);
        console.error('MIME Error', error);
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

      // Not a city → treat as shop text search
      const results = await performTextSearch(query);
      await displaySearchResults(results, getMapInstance());
      searchDropdown.classList.add('hidden');
    } catch (error) {
      console.error('Text search error:', error);
      searchDropdown.classList.add('hidden');
    }
  });

  // Delegated click listener (city vs shop)
  searchDropdown.addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-place-id]');
    if (!li) return;

    const type = li.dataset.type; // "city" or "shop"
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

    // Shop flow
    try {
      const place = await getPlaceDetails(placeId);
      await focusShopOnMap(place);
      searchDropdown.classList.add('hidden');
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  });
}

/* -------------------- Helpers -------------------- */

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Return both city and place predictions.
 */
async function getPlacePredictionsGrouped(query) {
  autocompleteService = autocompleteService || new google.maps.places.AutocompleteService();
  const mapInstance = getMapInstance();
  const userLatLng = mapInstance?.map?.getCenter();

  const baseNearbyOpts = userLatLng
    ? {
        location: new google.maps.LatLng(userLatLng.lat, userLatLng.lng),
        radius: 50000
      }
    : {};

  const citiesPromise = new Promise((resolve) => {
    autocompleteService.getPlacePredictions(
      {
        input: query,
        types: ['(cities)'],
        ...baseNearbyOpts
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) resolve(predictions || []);
        else resolve([]); // swallow to avoid killing UX
      }
    );
  });

  const placesPromise = new Promise((resolve) => {
    autocompleteService.getPlacePredictions(
      {
        input: query,
        types: ['establishment', 'geocode'],
        ...baseNearbyOpts
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) resolve(predictions || []);
        else resolve([]);
      }
    );
  });

  const [cities, places] = await Promise.all([citiesPromise, placesPromise]);

  // Deduplicate any overlapping predictions (rare, but safe)
  const placeIds = new Set();
  const uniqueCities = [];
  const uniquePlaces = [];

  cities.forEach((c) => {
    if (!placeIds.has(c.place_id)) {
      placeIds.add(c.place_id);
      uniqueCities.push(c);
    }
  });

  places.forEach((p) => {
    if (!placeIds.has(p.place_id)) {
      placeIds.add(p.place_id);
      uniquePlaces.push(p);
    }
  });

  return { cities: uniqueCities, places: uniquePlaces };
}

function renderSearchResults({ cities, places }, dropdown) {
  dropdown.innerHTML = '';

  const hasCities = cities && cities.length > 0;
  const hasPlaces = places && places.length > 0;

  if (!hasCities && !hasPlaces) {
    const li = document.createElement('li');
    li.textContent = 'No results found';
    dropdown.appendChild(li);
    dropdown.classList.remove('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();

  if (hasCities) {
    const header = document.createElement('li');
    header.className = 'search-section-header';
    header.textContent = 'Cities';
    fragment.appendChild(header);

    cities.forEach((prediction) => {
      const li = document.createElement('li');
      li.textContent = prediction.description;
      li.dataset.placeId = prediction.place_id;
      li.dataset.type = 'city';
      li.className = 'search-result search-result-city';
      fragment.appendChild(li);
    });
  }

  if (hasPlaces) {
    const header = document.createElement('li');
    header.className = 'search-section-header';
    header.textContent = 'Shops';
    fragment.appendChild(header);

    places.forEach((prediction) => {
      const li = document.createElement('li');
      li.textContent = prediction.description;
      li.dataset.placeId = prediction.place_id;
      li.dataset.type = 'shop';
      li.className = 'search-result search-result-shop';
      fragment.appendChild(li);
    });
  }

  dropdown.appendChild(fragment);
  dropdown.classList.remove('hidden');
}

/**
 * Called on Enter. If the query looks like a city, handle and return true.
 */
async function tryHandleAsCity(query) {
  const { cities } = await getPlacePredictionsGrouped(query);
  if (!cities.length) return false;

  // Use the top city result
  try {
    const result = await geocodePlaceId(cities[0].place_id);
    if (result?.types?.some((t) => CITY_TYPES.has(t))) {
      await centerMapOnCity(result);
      return true;
    }
  } catch (e) {
    console.warn('Failed to center on city, falling back to shop search.', e);
  }

  return false;
}

async function geocodePlaceId(placeId) {
  geocoder = geocoder || new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ placeId }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve(results[0]);
      } else {
        reject(status);
      }
    });
  });
}

async function centerMapOnCity(geoResult) {
  const { map } = getMapInstance();
  if (!map || !geoResult) return;

  // Remove any previous markers (optional UX choice)
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

  // Optional toast:
  console.log(`Centered on ${geoResult.formatted_address}`);
}

async function getPlaceDetails(placeId) {
  placesService = placesService || new google.maps.places.PlacesService(document.createElement('div'));
  return new Promise((resolve, reject) => {
    placesService.getDetails({ placeId }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        resolve(place);
      } else {
        reject(status);
      }
    });
  });
}

async function focusShopOnMap(place) {
  const { map, customIcon } = getMapInstance();
  if (!map) return;

  // Clear existing markers
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

  // Prepare shop object
  const shop = {
    name: place.name,
    address: place.formatted_address,
    lat,
    lng,
    city: extractCityFromAddressComponents(place.address_components) || 'Unknown',
    phone: place.formatted_phone_number || null
  };

  // Ensure shop ID
  shop.id = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);

  // Show floating card
  await showFloatingCard(shop);
}

function extractCityFromAddressComponents(components) {
  if (!components) return 'Unknown City';
  const cityComponent = components.find(c =>
    c.types.includes('locality') || c.types.includes('administrative_area_level_2')
  );
  return cityComponent ? cityComponent.long_name.toLowerCase() : 'Unknown City';
}

async function performTextSearch(query) {
  placesService = placesService || new google.maps.places.PlacesService(document.createElement('div'));
  const mapInstance = getMapInstance();
  const userLatLng = mapInstance?.map?.getCenter();

  return new Promise((resolve, reject) => {
    const request = {
      query: `coffee shop ${query}`,
      type: 'cafe'
    };

    if (userLatLng) {
      request.location = new google.maps.LatLng(userLatLng.lat, userLatLng.lng);
      request.radius = 50000;
    }

    placesService.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        resolve(results || []);
      } else {
        reject(status);
      }
    });
  });
}

async function displaySearchResults(results, mapInstance) {
  const map = mapInstance.map;
  const coffeeIcon = mapInstance.customIcon;
  currentMarkers.forEach(marker => map.removeLayer(marker));
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
    map.setView(
      [
        results[0].geometry.location.lat(),
        results[0].geometry.location.lng()
      ],
      13
    );
  }
}
