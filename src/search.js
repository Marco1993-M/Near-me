import { getMapInstance } from './map.js';
import { showFloatingCard } from './shops.js';
import { getOrCreateShop } from './db.js';

let searchInput;
let searchDropdown;
let autocompleteService;
let placesService;
let currentMarkers = [];
let searchInitialized = false;

export function initSearch(supabase) {
  if (searchInitialized) return;
  searchInitialized = true;

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

  const map = mapInstance.map;
  const coffeeIcon = mapInstance.customIcon;

  // Debounced input handler
  searchInput.addEventListener('input', debounce(async (e) => {
    const searchQuery = e.target.value.trim();
    if (!searchQuery) {
      searchDropdown.classList.add('hidden');
      return;
    }

    try {
      const predictions = await getPlacePredictions(searchQuery);
      renderSearchResults(predictions, searchDropdown);
    } catch (error) {
      console.error('Error searching places:', error);
      searchDropdown.classList.add('hidden');
    }
  }, 300));

  // Enter key for text search
  searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (!query) return;
      try {
        const results = await performTextSearch(query);
        displaySearchResults(results, mapInstance);
        searchDropdown.classList.add('hidden');
      } catch (error) {
        console.error('Text search error:', error);
        searchDropdown.classList.add('hidden');
      }
    }
  });

  // Delegated click listener
  searchDropdown.addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-place-id]');
    if (!li) {
      console.log('Click ignored: not on a valid search result');
      return;
    }

    const placeId = li.dataset.placeId;
    try {
      const place = await getPlaceDetails(placeId);

      // Clear existing markers
      currentMarkers.forEach(marker => map.removeLayer(marker));
      currentMarkers = [];

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      const marker = L.marker([lat, lng], { icon: coffeeIcon })
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
        city: extractCityFromAddressComponents(place.address_components) || 'Unknown',
        phone: place.formatted_phone_number || null
      };

      shop.id = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);

      await showFloatingCard(shop);
      searchDropdown.classList.add('hidden');
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function ensurePlacesService() {
  if (!placesService) {
    const mapDiv = getMapInstance()?.map?.getDiv();
    if (!mapDiv || typeof mapDiv.getDiv !== 'function' && !(mapDiv instanceof HTMLElement)) {
      console.warn('Map div not found or invalid, using dummy div for PlacesService');
      placesService = new google.maps.places.PlacesService(document.createElement('div'));
    } else {
      placesService = new google.maps.places.PlacesService(mapDiv);
    }
  }
  return placesService;
}

async function getPlacePredictions(query) {
  autocompleteService = autocompleteService || new google.maps.places.AutocompleteService();
  const mapInstance = getMapInstance();
  const userLatLng = mapInstance?.map?.getCenter();

  return new Promise((resolve, reject) => {
    const request = {
      input: query,
      types: ['establishment', 'geocode'],
    };

    if (userLatLng) {
      request.location = new google.maps.LatLng(userLatLng.lat, userLatLng.lng);
      request.radius = 50000;
    }

    autocompleteService.getPlacePredictions(request, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        resolve(predictions || []);
      } else {
        console.error('Prediction error:', status);
        reject(status);
      }
    });
  });
}

async function getPlaceDetails(placeId) {
  const service = ensurePlacesService();
  return new Promise((resolve, reject) => {
    service.getDetails({ placeId }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        resolve(place);
      } else {
        console.error('Place details error:', status);
        reject(status);
      }
    });
  });
}

function renderSearchResults(predictions, dropdown) {
  dropdown.innerHTML = '';
  if (!predictions || predictions.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No results found';
    dropdown.appendChild(li);
    dropdown.classList.remove('hidden');
    return;
  }

  predictions.forEach(prediction => {
    const li = document.createElement('li');
    li.textContent = prediction.description;
    li.dataset.placeId = prediction.place_id;
    dropdown.appendChild(li);
  });

  dropdown.classList.remove('hidden');
}

function extractCityFromAddressComponents(components) {
  if (!components) return 'Unknown City';
  const cityComponent = components.find(c =>
    c.types.includes('locality') || c.types.includes('administrative_area_level_2')
  );
  return cityComponent ? cityComponent.long_name.toLowerCase() : 'Unknown City';
}

async function performTextSearch(query) {
  const service = ensurePlacesService();
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

    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        resolve(results || []);
      } else {
        console.error('Text search error:', status);
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
    map.setView([
      results[0].geometry.location.lat(),
      results[0].geometry.location.lng()
    ], 13);
  }
}
