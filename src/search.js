import { getMapInstance } from './map.js';
import { showFloatingCard } from './shops.js'; // Import from shops.js
import { getOrCreateShop } from './db.js'; // For shop ID

let searchInput;
let searchDropdown;
let autocompleteService;
let placesService;
let currentMarkers = [];
let currentShop = null;

export function initSearch(supabase) {
  console.log('Initializing search...');
  if (!google?.maps?.places) {
    console.error('Google Maps API is not loaded');
    console.error('Google Maps Places API is not loaded');
    searchInput = document.getElementById('search-bar');
    if (searchInput) {
      searchInput.disabled = true;
      searchInput.placeholder = 'Search unavailable';
    }
    return;
  }

  searchInput = document.getElementById('search-bar');
  console.log('Search input element:', searchInput);
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
    console.log('Input event triggered');
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

  // Dropdown click handler
  searchDropdown.addEventListener('click', async (e) => {
    const li = e.target.closest('li');
    if (li) {
      const placeId = li.dataset.placeId;
      try {
        const place = await getPlaceDetails(placeId);
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];

        const marker = L.marker([place.geometry.location.lat(), place.geometry.location.lng()], { icon: coffeeIcon })
          .addTo(map)
          .bindPopup(place.name)
          .openPopup();
        marker._shopId = null;
        currentMarkers.push(marker);

        map.setView([place.geometry.location.lat(), place.geometry.location.lng()], 15);

        // Prepare shop object for showFloatingCard
        const shop = {
          name: place.name,
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          city: extractCityFromAddressComponents(place.address_components) || 'Unknown',
          phone: place.formatted_phone_number || null
        };

        // Get or create shop ID
        shop.id = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);

        // Use shops.js's showFloatingCard
        console.log('Showing floating card');
        await showFloatingCard(shop);

        searchDropdown.classList.add('hidden');
      } catch (error) {
        console.error('Error getting place details:', error);
      }
    }
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    console.log('Debounce function called');
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

async function getPlacePredictions(query) {
  autocompleteService = autocompleteService || new google.maps.places.AutocompleteService();
  console.log('Autocomplete service:', autocompleteService);

  const mapInstance = getMapInstance();
  const userLatLng = mapInstance?.map?.getCenter();

  return new Promise((resolve, reject) => {
    const request = {
      input: query,
      types: ['establishment', 'geocode'],
    };

    // Add location bias if available
    if (userLatLng) {
      request.location = new google.maps.LatLng(userLatLng.lat, userLatLng.lng);
      request.radius = 50000; // 50km radius
    }

    autocompleteService.getPlacePredictions(request, (predictions, status) => {
      console.log('Autocomplete status:', status, 'Predictions:', predictions);
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        resolve(predictions || []);
      } else {
        reject(status);
      }
    });
  });
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

function renderSearchResults(predictions, searchDropdown) {
  console.log('Rendering search results...');
  searchDropdown.innerHTML = '';
  if (!predictions || predictions.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No results found';
    searchDropdown.appendChild(li);
    searchDropdown.classList.remove('hidden');
    return;
  }

  predictions.forEach((prediction) => {
    const li = document.createElement('li');
    li.textContent = prediction.description;
    li.dataset.placeId = prediction.place_id;
    searchDropdown.appendChild(li);
  });

  searchDropdown.classList.remove('hidden');
}

function extractCityFromAddressComponents(addressComponents) {
  if (!addressComponents) return 'Unknown City';
  const cityComponent = addressComponents.find(component =>
    component.types.includes('locality') || component.types.includes('administrative_area_level_2')
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

    // Optional: Add location bias for text search
    if (userLatLng) {
      request.location = new google.maps.LatLng(userLatLng.lat, userLatLng.lng);
      request.radius = 50000; // 50km radius
    }

    placesService.textSearch(request, (results, status) => {
      console.log('Text search status:', status, 'Results:', results);
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
    const marker = L.marker([place.geometry.location.lat(), place.geometry.location.lng()], { icon: coffeeIcon })
      .addTo(map)
      .bindPopup(place.name);
    marker._shopId = null;
    currentMarkers.push(marker);

    // Prepare shop object
    const shop = {
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      city: extractCityFromAddressComponents(place.address_components) || 'Unknown',
      phone: place.formatted_phone_number || null
    };
    shop.id = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng, supabase);
    marker._shopId = shop.id;
    marker.on('click', () => showFloatingCard(shop));
  }
  if (results.length > 0) {
    map.setView([results[0].geometry.location.lat(), results[0].geometry.location.lng()], 13);
  }
}
