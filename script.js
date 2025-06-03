const apiKey = 'AIzaSyB6PCrEeC-cr9YRt_DX-iil3MbLX845_ps'; // Replace with your actual Google Maps API key

const client = window.supabase.createClient(
  'https://mqfknhzpjzfhuxusnasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs'
);

// Store favorited shops (can use localStorage for persistence)
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

function saveFavorites() {
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function addToFavorites(shop) {
  if (!favorites.some(fav => fav.name === shop.name && fav.address === shop.address)) {
    favorites.push(shop);
    saveFavorites();
    console.log(`Added to favorites: ${shop.name}`);
  } else {
    console.log(`${shop.name} is already in favorites`);
  }
}

function updateFavoritesModal() {
  console.log('Updating favorites modal');
  const favoritesList = document.getElementById('favorites-list');
  if (!favoritesList) {
    console.error('Favorites list element not found');
    return;
  }

  if (favorites.length === 0) {
    favoritesList.innerHTML = '<p class="favorite-modal-loading">No favorite shops yet.</p>';
    console.log('No favorites to display');
    return;
  }

  favoritesList.className = 'favorite-modal-list';
  favoritesList.innerHTML = '';

  favorites.forEach(shop => {
    const li = document.createElement('li');
    li.className = 'favorite-modal-list-item';
    li.innerHTML = `
      <span class="favorite-modal-shop-info">${shop.name}</span>
      <div class="favorite-modal-actions">
        <button class="favorite-modal-button view-shop" aria-label="View ${shop.name}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button class="favorite-modal-button remove" aria-label="Remove ${shop.name} from favorites">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a2 2 0 00-2 2h8a2 2 0 00-2-2m-4 0H6m4 4v12m4-12v12" />
          </svg>
        </button>
      </div>
    `;
    favoritesList.appendChild(li);
  });

  const viewButtons = document.querySelectorAll('.favorite-modal-button.view-shop');
  viewButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const shopName = button.parentElement.parentElement.querySelector('.favorite-modal-shop-info').textContent;
      const shop = favorites.find(s => s.name === shopName);
      if (shop) {
        console.log('Viewing shop from favorites:', shopName);
        currentShop = shop;
        showShopDetails(shop);
        document.getElementById('favorite-modal').classList.add('hidden');
      } else {
        console.error('Shop not found in favorites:', shopName);
      }
    });
  });

  const removeButtons = document.querySelectorAll('.favorite-modal-button.remove');
  removeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const shopName = button.parentElement.parentElement.querySelector('.favorite-modal-shop-info').textContent;
      favorites = favorites.filter(fav => fav.name !== shopName);
      console.log('Removed from favorites:', shopName);
      updateFavoritesModal();
      const floatingCard = document.getElementById('floating-card');
      if (floatingCard && currentShop && currentShop.name === shopName) {
        floatingCard.querySelector('#favorite-button svg').setAttribute('fill', 'none');
        floatingCard.querySelector('#favorite-button').setAttribute('aria-label', `Add ${shopName} to favorites`);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initial floating-card state:', document.getElementById('floating-card')?.classList.contains('hidden') ? 'hidden' : 'visible');

  const navButtons = [
    { id: 'cities-button', modalId: 'cities-modal' },
    { id: 'top-100-button', modalId: 'top100-modal' },
    { id: 'favorites-button', modalId: 'favorite-modal' }
  ];

  function setupNavButton({ id, modalId }) {
    const button = document.getElementById(id);
    const modal = document.getElementById(modalId);

    if (!button) {
      console.error(`Navigation button not found: #${id}`);
      return false;
    }
    if (!modal) {
      console.error(`Modal not found: #${modalId}`);
      button.setAttribute('disabled', 'true');
      button.classList.add('opacity-50', 'cursor-not-allowed');
      return false;
    }

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`Clicked ${id}, toggling ${modalId}`);

      document.querySelectorAll('#filter-modal, #cities-modal, #top100-modal, #favorite-modal')
        .forEach(m => m.classList.add('hidden'));
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

      modal.classList.remove('hidden');
      button.classList.add('active');

      if (modalId === 'favorite-modal') {
        updateFavoritesModal();
      }

      if (modalId === 'top100-modal') {
        displayTop100Shops();
      }

      if (modalId === 'cities-modal') {
        fetchNearbyCities();
      }

      console.log(`${modalId} state:`, modal.classList.contains('hidden') ? 'hidden' : 'visible');
    });

    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });

    console.log(`Successfully set up button: ${id} -> ${modalId}`);
    return true;
  }

  function setupNavButtons() {
    let successful = 0;
    navButtons.forEach(nav => {
      if (setupNavButton(nav)) {
        successful++;
      }
    });

    if (successful < navButtons.length) {
      console.error(`Failed to set up ${navButtons.length - successful} navigation buttons`);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white p-4 rounded';
      errorDiv.textContent = 'Some navigation features are unavailable. Please refresh the page.';
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000);
    } else {
      console.log('All navigation buttons set up successfully');
    }
  }

  setupNavButtons();

  const favoriteButton = document.getElementById('favorite-button');
  const floatingCard = document.getElementById('floating-card');

  if (favoriteButton && floatingCard) {
    favoriteButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const shopName = floatingCard.querySelector('h3').childNodes[2].textContent.trim();
      const address = floatingCard.querySelectorAll('p')[0].childNodes[2].textContent.trim();
      const rating = floatingCard.querySelectorAll('p')[1].childNodes[2].textContent.trim().replace('Rating: ', '');

      const shop = {
        name: shopName,
        address: address,
        rating: rating
      };

      addToFavorites(shop);
    });
  }

  document.addEventListener('click', function(e) {
    const modals = document.querySelectorAll('#filter-modal, #cities-modal, #top100-modal, #favorite-modal');
    const isClickInsideModal = Array.from(modals).some(modal => modal.contains(e.target));
    const isClickOnNavButton = navButtons.some(({ id }) => document.getElementById(id)?.contains(e.target));
    if (!isClickInsideModal && !isClickOnNavButton) {
      modals.forEach(modal => {
        if (!modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
          console.log(`Closed modal: ${modal.id} (clicked outside)`);
        }
      });
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    }
  });

  document.querySelectorAll('#filter-modal, #cities-modal, #top100-modal, #favorite-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  document.querySelectorAll('.close-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const modal = button.closest('.modal');
      if (modal) {
        modal.classList.add('hidden');
        console.log(`Closed modal: ${modal.id} (via close button)`);
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      }
    });
  });

  try {
  var map = L.map('map').setView([48.8566, 2.3522], 13);
  console.log('Map initialized successfully');

  var tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© Carto',
  }).addTo(map);

  tileLayer.on('tileerror', function(error) {
    console.error('Tile loading error with OpenStreetMap:', error);
    console.error('Tile URL attempted:', error.tile.src);
    console.warn('Attempting fallback tile provider (Stamen Terrain)...');

    map.removeLayer(tileLayer);

    var fallbackTileLayer = L.tileLayer('https://{s}.tile.stamen.com/terrain/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© Stamen Design'
    }).addTo(map);

    fallbackTileLayer.on('tileerror', function(fallbackError) {
      console.error('Fallback tile loading error with Stamen Terrain:', fallbackError);
      console.error('Fallback tile URL attempted:', fallbackError.tile.src);
      document.getElementById('map')?.classList.add('map-failed');
    });

    fallbackTileLayer.on('load', function() {
      console.log('Fallback tiles (Stamen Terrain) loaded successfully');
    });
  });

  tileLayer.on('load', function() {
    console.log('OpenStreetMap tiles loaded successfully');
  });

  // Neumorphic-style marker with proper class
  const coffeeIcon = L.divIcon({
    className: 'custom-neumorphic-icon',
    html: '<div class="neumorphic-marker"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  // Use coffeeIcon for the initial marker
  L.marker([48.8566, 2.3522], { icon: coffeeIcon })
    .addTo(map)
    .bindPopup("Neumorphic Coffee Shop");

  setTimeout(function() {
    map.invalidateSize();
    console.log('Map size recalculated');
  }, 100);

  const searchInput = document.getElementById('search-bar');
  const searchDropdown = document.getElementById('search-dropdown');
  let autocompleteService;
  let placesService;
  let geocoder;
  let userLocation = null;
  let currentShop = null;
  let filterState = {
    parking: false,
    petFriendly: false,
    specialtyCoffee: false
  };
  let currentMarkers = [];
  let shops = [];
  let reviews = [];
  let cityCoordinates = {};
  const currentUser = "user123";

    function extractCityFromAddressComponents(addressComponents) {
      if (!addressComponents) return "Unknown City";
      const cityComponent = addressComponents.find(component => 
        component.types.includes("locality") || component.types.includes("administrative_area_level_2")
      );
      return cityComponent ? cityComponent.long_name.toLowerCase() : "Unknown City";
    }

    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    }

    window.initGoogleMaps = function() {
      console.log('Google Maps API loaded successfully');
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        autocompleteService = new google.maps.places.AutocompleteService();
        placesService = new google.maps.places.PlacesService(document.createElement('div'));
        geocoder = new google.maps.Geocoder();
        console.log('AutocompleteService initialized');
        console.log('PlacesService initialized');
        console.log('Geocoder initialized');
        searchInput.disabled = false;
        searchInput.placeholder = 'Search for coffee shops...';
        console.log('Search bar enabled');
      } else {
        console.error('Google Maps Places API failed to load. Check your API key and ensure the Places library is included.');
        searchInput.disabled = true;
        searchInput.placeholder = 'Search unavailable (API failed)';
        console.log('Search bar disabled due to API failure');
      }
    };

    setTimeout(() => {
      if (searchInput.disabled) {
        console.warn('Google Maps API failed to load within 10 seconds. Enabling search bar as fallback (search functionality may not work).');
        searchInput.disabled = false;
        searchInput.placeholder = 'Search unavailable (API timeout)';
      }
    }, 10000);

    function generatePointsAroundLocation(lat, lng, radius, numPoints = 8) {
      const points = [];
      const earthRadius = 6371000; // Earth's radius in meters
      const latRad = lat * Math.PI / 180;
      const lngRad = lng * Math.PI / 180;

      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 360 / numPoints) * Math.PI / 180;
        const newLat = lat + (radius / earthRadius) * (180 / Math.PI) * Math.cos(angle);
        const newLng = lng + (radius / earthRadius) * (180 / Math.PI) * Math.sin(angle) / Math.cos(latRad);
        points.push({ lat: newLat, lng: newLng });
      }

      points.push({ lat, lng });
      return points;
    }

   async function fetchNearbyCities() {
  const citiesModal = document.getElementById('cities-modal');
  const cityButtonsContainer = document.getElementById('city-buttons');
  if (!citiesModal) console.error('Cities modal not found');
  if (!cityButtonsContainer) console.error('City buttons container not found');
  if (!citiesModal || !cityButtonsContainer) return;

  // Fetch all cities from the shops table in Supabase
  if (!supabase) {
    console.error('Supabase not initialized. Aborting fetchNearbyCities.');
    return;
  }
  const { data: shops, error } = await supabase
    .from('shops')
    .select('city')
    .order('city', { ascending: true });

  if (error) {
    console.error('Supabase error fetching cities:', error);
    return;
  }
  console.log('Fetched shops from Supabase:', shops);

  // Extract unique cities and sort them
  const allCities = new Set(shops.map(shop => shop.city.trim().toLowerCase()));
  const sortedCities = Array.from(allCities).sort();
  console.log('All cities from Supabase:', sortedCities);

  // Determine user's location to select hardcoded cities
  let lat, lng;
  if (userLocation && Array.isArray(userLocation) && userLocation.length === 2) {
    [lat, lng] = userLocation;
  } else {
    const center = map.getCenter();
    lat = typeof center.lat === 'function' ? center.lat() : center.lat;
    lng = typeof center.lng === 'function' ? center.lng() : center.lng;
  }

  // Hardcoded city coordinates (South Africa focus)
  const cityCoords = {
    'cape town': [-33.9249, 18.4241],
    'johannesburg': [-26.2041, 28.0473],
    'durban': [-29.8587, 31.0218]
  };

  // Calculate distances and sort cities by proximity
  const distances = Object.keys(cityCoords).map(city => {
    const [cityLat, cityLng] = cityCoords[city];
    const distance = Math.sqrt(Math.pow(cityLat - lat, 2) + Math.pow(cityLng - lng, 2));
    return { city, distance };
  }).sort((a, b) => a.distance - b.distance);

  // Select the 3 closest cities (or default to all if fewer than 3)
  const hardcodedCities = distances.slice(0, 3).map(d => d.city);

  // Render the modal with search bar and hardcoded city filters
  cityButtonsContainer.innerHTML = `
    <div class="city-search-wrapper">
      <input type="text" id="city-search" placeholder="Search for a city..." class="city-search-input">
      <div class="cities-modal-buttons" id="city-suggestions">
        ${sortedCities.map(city => `
          <button class="cities-modal-button" data-city="${city}">
            ${city.charAt(0).toUpperCase() + city.slice(1)}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="hardcoded-cities flex justify-between mb-4">
      ${hardcodedCities.map(city => `
        <button class="hardcoded-city-button cities-modal-button" data-city="${city}">
          ${city.charAt(0).toUpperCase() + city.slice(1)}
        </button>
      `).join('')}
    </div>
  `;
  citiesModal.classList.remove('hidden');
  console.log('Modal and search bar rendered. Checking DOM:', {
    cityButtonsContainer: cityButtonsContainer.innerHTML,
    searchInput: document.getElementById('city-search')
  });

  // Close button functionality
  console.log('Cities modal in DOM:', document.getElementById('cities-modal'));
  const closeButton = citiesModal.querySelector('.close-button');
  console.log('Close button found:', closeButton);
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      console.log('Close button clicked');
      citiesModal.classList.add('hidden');
    });
  } else {
    console.error('Close button not found in citiesModal');
  }

  // Combined search and event listener attachment
  const searchInput = cityButtonsContainer.querySelector('#city-search');
  const suggestionsDiv = cityButtonsContainer.querySelector('#city-suggestions');
  if (!searchInput || !suggestionsDiv) {
    console.error('Search input or suggestions div not found in DOM after render');
    return;
  }
  console.log('Search input and suggestions div found after render:', { searchInput, suggestionsDiv });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    console.log('Search query:', query);

    // Filter cities: prioritize startsWith, then includes
    const filteredCities = sortedCities
      .filter(city => city && city.toLowerCase().startsWith(query))
      .concat(sortedCities.filter(city => city && !city.toLowerCase().startsWith(query) && city.toLowerCase().includes(query)));
    console.log('Filtered cities before rendering:', filteredCities);

    // Update suggestions
    suggestionsDiv.innerHTML = filteredCities.length > 0
      ? filteredCities.map(city => `
          <button class="cities-modal-button" data-city="${city}">
            ${city.charAt(0).toUpperCase() + city.slice(1)}
          </button>
        `).join('')
      : '<p class="text-gray-500 p-2">No cities found.</p>';
    suggestionsDiv.classList.toggle('active', filteredCities.length > 0);

    // Attach click listeners to new buttons
    const cityButtons = suggestionsDiv.querySelectorAll('.cities-modal-button');
    cityButtons.forEach(button => {
      button.removeEventListener('click', button._clickHandler);
      const clickHandler = (e) => {
        e.stopPropagation();
        const city = button.dataset.city.toLowerCase();
        console.log('Selected city:', city);

        const [cityLat, cityLng] = cityCoords[city] || [lat, lng];
        cityCoordinates[city] = [cityLat, cityLng];
        map.setView([cityLat, cityLng], 13);
        map.invalidateSize();

        fetchShopsByCity(city, selectedRatingFilter);
        citiesModal.classList.add('hidden');
      };
      button._clickHandler = clickHandler;
      button.addEventListener('click', clickHandler);
    });
  });

  // Attach listeners to hardcoded city buttons and initial suggestions
  const allCityButtons = cityButtonsContainer.querySelectorAll('.cities-modal-button');
  allCityButtons.forEach(button => {
    const clickHandler = (e) => {
      e.stopPropagation();
      const city = button.dataset.city.toLowerCase();
      console.log('Selected city:', city);

      const [cityLat, cityLng] = cityCoords[city] || [lat, lng];
      cityCoordinates[city] = [cityLat, cityLng];
      map.setView([cityLat, cityLng], 13);
      map.invalidateSize();

      fetchShopsByCity(city, selectedRatingFilter);
      citiesModal.classList.add('hidden');
    };
    button._clickHandler = clickHandler;
    button.addEventListener('click', clickHandler);
  });
}

    function fetchPlaces(query) {
      if (!autocompleteService) {
        console.error('AutocompleteService not initialized. Ensure Google Maps API loaded correctly.');
        searchDropdown.innerHTML = '';
        searchDropdown.classList.add('hidden');
        return;
      }
      if (!query || query.length < 3) {
        searchDropdown.innerHTML = '';
        searchDropdown.classList.add('hidden');
        console.log('Skipping fetch: Query too short or empty');
        return;
      }

      const location = userLocation || map.getCenter();
      const latLng = new google.maps.LatLng(location.lat, location.lng);

      const request = {
        input: query,
        types: ['establishment'],
        locationBias: latLng
      };

      console.log('Sending Autocomplete request:', request);
      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        console.log('Places API response status:', status);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
          searchDropdown.innerHTML = predictions.map(prediction => `
            <div class="search-option p-2 hover:bg-gray-100 cursor-pointer" data-place-id="${prediction.place_id}">
              ${prediction.description}
            </div>
          `).join('');
          searchDropdown.classList.remove('hidden');
          console.log('Dropdown populated with predictions:', predictions);
        } else {
          searchDropdown.innerHTML = '<div class="p-2">No results found (Status: ' + status + ')</div>';
          searchDropdown.classList.remove('hidden');
          console.log('No predictions received, status:', status);
        }
      });
    }

    const debouncedFetchPlaces = debounce(fetchPlaces, 300);
    searchInput?.addEventListener('input', function() {
      console.log('Search input changed:', this.value);
      if (!searchInput.disabled) {
        debouncedFetchPlaces(this.value);
      } else {
        console.warn('Search disabled, API not ready');
        searchDropdown.innerHTML = '<div class="p-2">Search unavailable (API not ready)</div>';
        searchDropdown.classList.remove('hidden');
      }
    });

    let isMarkerClick = false;

      searchDropdown?.addEventListener('click', function(e) {
    e.stopPropagation();
    const option = e.target.closest('.search-option');
    if (option) {
      const placeId = option.getAttribute('data-place-id');
      if (placesService && placeId) {
        console.log('Search dropdown option clicked, placeId:', placeId);
        searchDropdown.classList.add('hidden');
        placesService.getDetails({ placeId: placeId, fields: ['name', 'geometry', 'rating', 'formatted_address', 'website', 'formatted_phone_number', 'address_components'] }, (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
            console.log('Place details fetched successfully:', place);
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const city = extractCityFromAddressComponents(place.address_components);

            const shopReviews = reviews.filter(r => r.shopName === place.name);

            const existingShop = shops.find(shop => shop.placeId === placeId);
            if (!existingShop) {
              shops.push({
                placeId: placeId,
                name: place.name || 'Unknown Shop',
                city: city,
                petFriendly: shopReviews.some(r => r.petFriendly) || false,
                parking: shopReviews.some(r => r.parking) || false,
                outsideSeating: shopReviews.some(r => r.outsideSeating) || false,
                lat: lat,
                lng: lng,
                address: place.formatted_address || 'No address available',
                website: place.website || 'No website available',
                phone: place.formatted_phone_number || 'No phone number available'
              });
            }

            currentMarkers.forEach(marker => map.removeLayer(marker));
            currentMarkers = [];

            map.setView([lat, lng], 15);
            // Use coffeeIcon for the search result marker
            const marker = L.marker([lat, lng], { icon: coffeeIcon })
              .addTo(map)
              .bindPopup(place.name);
            marker.on('click', function() {
              console.log('Marker clicked for:', place.name);
              isMarkerClick = true;
              currentShop = {
                name: place.name || 'Unknown Shop',
                rating: place.rating ? place.rating + ' / 5' : 'N/A',
                address: place.formatted_address || 'No address available',
                website: place.website || 'No website available',
                phone: place.formatted_phone_number || 'No phone number available',
                features: {
                  parking: shopReviews.some(r => r.parking) || false,
                  petFriendly: shopReviews.some(r => r.petFriendly) || false,
                  specialtyCoffee: shopReviews.some(r => r.specialtyCoffee) || false
                },
                lat: lat,
                lng: lng,
                city: city
              };
              console.log('currentShop set from marker click:', currentShop);
              showFloatingCard(currentShop);
              console.log('Floating card state after show:', document.getElementById('floating-card').classList.toString());
              setTimeout(() => { isMarkerClick = false; }, 100);
            });
            currentMarkers.push(marker);
            marker.openPopup();

            currentShop = {
              name: place.name || 'Unknown Shop',
              rating: place.rating ? place.rating + ' / 5' : 'N/A',
              address: place.formatted_address || 'No address available',
              website: place.website || 'No website available',
              phone: place.formatted_phone_number || 'No phone number available',
              features: {
                parking: shopReviews.some(r => r.parking) || false,
                petFriendly: shopReviews.some(r => r.petFriendly) || false,
                specialtyCoffee: shopReviews.some(r => r.specialtyCoffee) || false
              },
              lat: lat,
              lng: lng,
              city: city
            };
            console.log('currentShop set from search selection:', currentShop);
            showFloatingCard(currentShop);

            searchDropdown.classList.add('hidden');
            searchInput.value = '';
            console.log('Search selection completed for:', place.name, 'Dropdown state:', searchDropdown.classList.contains('hidden') ? 'hidden' : 'visible');
          } else {
            console.error('Failed to fetch place details:', status, 'Place data:', place);
            alert('Failed to fetch place details: ' + status);
            searchDropdown.classList.add('hidden');
          }
        });
      } else {
        console.error('PlacesService not initialized or invalid placeId:', placeId);
        alert('Search failed: Places service not ready or invalid place ID.');
        searchDropdown.classList.add('hidden');
      }
    } else {
      console.warn('Clicked element is not a search option:', e.target);
    }
  });

  // Update geolocation markers
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      userLocation = [position.coords.latitude, position.coords.longitude];
      map.setView(userLocation, 13);
      const userMarker = L.marker(userLocation, { icon: coffeeIcon })
        .addTo(map)
        .bindPopup('You are here')
        .openPopup();
      console.log('Initial user location set:', userLocation);
    }, function(error) {
      console.error('Initial geolocation error, falling back to default location:', error);
      userLocation = [48.8566, 2.3522];
      map.setView(userLocation, 13);
      const defaultMarker = L.marker(userLocation, { icon: coffeeIcon })
        .addTo(map)
        .bindPopup('Default location (Paris)')
        .openPopup();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  } else {
    console.warn('Geolocation not supported, using default location.');
    userLocation = [48.8566, 2.3522];
    map.setView(userLocation, 13);
    const defaultMarker = L.marker(userLocation, { icon: coffeeIcon })
      .addTo(map)
      .bindPopup('Default location (Paris)')
      .openPopup();
  }

  const userLocationButton = document.getElementById('user-location-button');
  if (userLocationButton) {
    userLocationButton.addEventListener('click', function() {
      console.log('User location button clicked');
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported by this browser');
        alert('Geolocation is not supported by your browser.');
        return;
      }

      userLocationButton.disabled = true;
      userLocationButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6 text-gray-600 animate-spin">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v2a2 2 0 002 2h12a2 2 0 002-2V4M8 12h8M10 16h4"/>
        </svg>
        Locating...
      `;

      navigator.geolocation.getCurrentPosition(
        function(position) {
          const newLocation = [position.coords.latitude, position.coords.longitude];
          console.log('User location retrieved:', newLocation);
          userLocation = newLocation;
          if (map) {
            map.setView(userLocation, 13);
            const userMarker = L.marker(userLocation, { icon: coffeeIcon })
              .addTo(map)
              .bindPopup('You are here')
              .openPopup();
            map.invalidateSize();
            console.log('Map centered on user location:', userLocation);
          } else {
            console.error('Map object is not initialized');
          }

          userLocationButton.disabled = false;
          userLocationButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          `;
        },
        function(error) {
          console.error('Failed to retrieve user location:', error.message, error.code);
          let errorMessage = 'Unable to access your location: ' + error.message;
          if (error.code === 1) {
            errorMessage += ' (Please allow location access in your browser settings)';
          } else if (error.code === 3) {
            errorMessage += ' (Timeout occurred despite initial success; using last known location)';
          }
          alert(errorMessage);

          userLocation = userLocation || [48.8566, 2.3522];
          if (map) {
            map.setView(userLocation, 13);
            const fallbackMarker = L.marker(userLocation, { icon: coffeeIcon })
              .addTo(map)
              .bindPopup(userLocation === [48.8566, 2.3522] ? 'Default location (Paris)' : 'Last known location')
              .openPopup();
            map.invalidateSize();
            console.log('Map centered on fallback location:', userLocation);
          }

          userLocationButton.disabled = false;
          userLocationButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          `;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  } else {
    console.error('User location button not found in DOM');
  }

    function calculateAverageRating(shopName) {
      const reviews = JSON.parse(localStorage.getItem(`reviews-${shopName}`)) || [];
      if (reviews.length === 0) return 0;
      const total = reviews.reduce((sum, review) => sum + Number(review.rating), 0);
      return (total / reviews.length).toFixed(1);
    }

    function showFloatingCard(shop) {
  if (!shop || !shop.name) {
    console.warn('Attempted to show floating card with invalid shop data:', shop);
    document.getElementById('floating-card')?.classList.add('hidden');
    return;
  }
  console.log('Showing floating card for:', shop.name);

  let averageRating = 0;
  try {
    averageRating = calculateAverageRating(shop.name);
  } catch (error) {
    console.error('Error calculating average rating:', error);
  }
  const displayRating = averageRating > 0 ? `${averageRating} / 10` : 'No ratings yet';

  const shopKey = `${shop.name}-${shop.lat}-${shop.lng}`;
  const isFavorited = favorites.some(fav => fav.name === shop.name && fav.address === shop.address);

  const coffeeIcon = `
    <svg class="text-brown-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
  `;
  const starIcon = `
    <svg class="text-yellow-500" fill="black" viewBox="0 0 24 24" width="16" height="16">
      <path d="M12 .587l3.668 7.431 8.332 1.151-6.001 5.822 1.417 8.262L12 18.707l-7.416 3.504 1.417-8.262-6.001-5.822 8.332-1.151z"/>
    </svg>
  `;

  const floatingCard = document.getElementById('floating-card');
  if (!floatingCard) {
    console.error('Floating card element not found');
    return;
  }

  // Extract the first line of the address
  const addressFirstLine = shop.address ? shop.address.split('\n')[0].trim().split(',')[0].trim() : 'Unknown Location';

  // Update dynamic content, replacing Website with Directions
  floatingCard.innerHTML = `
    <button class="floating-card-close-button" aria-label="Close ${shop.name} details">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h3 class="floating-card-heading">${shop.name}</h3>
    <p class="floating-card-info">${addressFirstLine} ${starIcon} ${displayRating}</p>
    <div class="floating-card-actions">
      ${shop.phone ? `
        <button id="call-button" class="floating-card-action-button" aria-label="Call ${shop.name}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          <span>Call</span>
        </button>
      ` : ''}
      ${shop.address ? `
        <button id="directions-button" class="floating-card-action-button" aria-label="Get directions to ${shop.name}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span>Directions</span>
        </button>
      ` : ''}
      <button id="share-button" class="floating-card-action-button" aria-label="Share ${shop.name}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span>Share</span>
      </button>
      <button id="favorite-button" class="floating-card-action-button" aria-label="${isFavorited ? `Remove ${shop.name} from favorites` : `Add ${shop.name} to favorites`}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="${isFavorited ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span>Favorite</span>
      </button>
    </div>
  `;
  floatingCard.classList.remove('hidden');
  console.log('Floating card classes after show:', floatingCard.classList.toString());

  // Add close button listener
  const closeButton = floatingCard.querySelector('.floating-card-close-button');
  if (closeButton) {
    closeButton.addEventListener('click', function(e) {
      e.stopPropagation();
      floatingCard.classList.add('hidden');
      console.log('Floating card closed via close button');
    });
  } else {
    console.error('Close button not found in floating card');
  }

  // Existing event listeners
  document.getElementById('share-button')?.addEventListener('click', function(e) {
    e.stopPropagation();
    if (currentShop) {
      console.log('Sharing shop:', currentShop.name);
      shareShop(currentShop);
    }
  });

  document.getElementById('favorite-button')?.addEventListener('click', function(e) {
    e.stopPropagation();
    if (currentShop) {
      const shopKey = `${currentShop.name}-${currentShop.lat}-${currentShop.lng}`;
      const isCurrentlyFavorited = favorites.some(fav => fav.name === currentShop.name && fav.address === currentShop.address);
      if (isCurrentlyFavorited) {
        favorites = favorites.filter(fav => !(fav.name === currentShop.name && fav.address === currentShop.address));
        this.querySelector('svg').setAttribute('fill', 'none');
        this.setAttribute('aria-label', `Add ${currentShop.name} to favorites`);
        console.log('Removed from favorites:', currentShop.name);
      } else {
        addToFavorites(currentShop);
        this.querySelector('svg').setAttribute('fill', 'currentColor');
        this.setAttribute('aria-label', `Remove ${currentShop.name} to favorites`);
        console.log('Added to favorites:', currentShop.name);
      }
      if (typeof updateFavoritesModal === 'function') {
        updateFavoritesModal();
      } else {
        console.error('updateFavoritesModal is not defined');
      }
    }
  });

  // Add call button listener
  document.getElementById('call-button')?.addEventListener('click', function(e) {
    e.stopPropagation();
    if (shop && shop.phone) {
      console.log('Initiating call for:', shop.name);
      window.location.href = `tel:${shop.phone}`;
    }
  });

  // Add directions button listener
  document.getElementById('directions-button')?.addEventListener('click', function(e) {
    e.stopPropagation();
    if (shop && shop.address) {
      console.log('Getting directions for:', shop.name);
      const encodedAddress = encodeURIComponent(shop.address);
      // Use geo: URI for native maps app, fallback to Google Maps
      const mapsUrl = `geo:0,0?q=${encodedAddress}`;
      window.location.href = mapsUrl;
    }
  });

  // Update the click handler to correctly identify the close button
  floatingCard.addEventListener('click', function(e) {
    if (
      e.target.closest('.floating-card-close-button') ||
      e.target.closest('#call-button') ||
      e.target.closest('#directions-button') ||
      e.target.closest('#share-button') ||
      e.target.closest('#favorite-button')
    ) {
      return;
    }

    if (shop) {
      console.log('Floating card clicked, showing shop details for:', shop.name);
      currentShop = shop;
      showShopDetails(shop);
      floatingCard.classList.add('hidden');
      console.log('Floating card hidden after opening shop details');
    } else {
      console.error('No shop data available for shop details. Current shop:', currentShop);
    }
  });
}

   function showShopDetails(shop) {
  if (!shop || !shop.name) {
    console.warn('Attempted to show shop details with invalid shop data:', shop);
    document.getElementById('shop-details-banner')?.classList.add('hidden');
    return;
  }
  console.log('Showing shop details for:', shop.name);

  const shopDetailsBanner = document.getElementById('shop-details-banner');
  if (!shopDetailsBanner) {
    console.error('Shop details banner element not found');
    return;
  }

  let averageRating = 0;
  try {
    averageRating = calculateAverageRating(shop.name);
  } catch (error) {
    console.error('Error calculating average rating:', error);
  }
  const displayRating = averageRating > 0 ? `${averageRating} / 10` : '0';

  const dotsHTML = Array.from({ length: 10 }, (_, i) => `
    <span class="shop-details-rating-dot" style="background-color: ${i < Math.floor(averageRating) ? '#4b5563' : '#d1d5db'};"></span>
  `).join('');

  const reviews = JSON.parse(localStorage.getItem(`reviews-${shop.name}`)) || [];
  const totalReviews = reviews.length;
  const breakdown = {
    Excellent: 0,
    'Very Good': 0,
    Average: 0,
    Poor: 0,
    Terrible: 0
  };
  reviews.forEach(review => {
    const rating = Number(review.rating);
    if (rating >= 8) breakdown.Excellent++;
    else if (rating >= 6) breakdown['Very Good']++;
    else if (rating >= 4) breakdown.Average++;
    else if (rating >= 2) breakdown.Poor++;
    else breakdown.Terrible++;
  });
  const breakdownHTML = Object.entries(breakdown).map(([category, count]) => `
    <div class="shop-details-breakdown-row">
      <span class="shop-details-breakdown-label">${category}</span>
      <div class="shop-details-progress-bar">
        <div class="shop-details-progress-bar-fill" style="width: ${totalReviews > 0 ? (count / totalReviews) * 100 : 0}%;"></div>
      </div>
      <span class="shop-details-breakdown-count">${count}</span>
    </div>
  `).join('');

  let reviewsHTML = '';
  if (reviews.length === 0) {
    reviewsHTML = '<p>No reviews yet.</p>';
  } else {
    reviewsHTML = `
      <div class="shop-details-reviews-container">
        <div class="shop-details-reviews-track">
          ${reviews.map(review => `
            <div class="shop-details-review-card">
              <p><strong>Rating:</strong> ${review.rating}/10</p>
              <p>${review.text}</p>
              <p></p> <!-- Removed amenities from here -->
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Aggregate amenities from all reviews
  const amenities = new Set();
  reviews.forEach(review => {
    if (review.parking) amenities.add('Parking Available');
    if (review.petFriendly) amenities.add('Pet Friendly');
    if (review.outsideSeating) amenities.add('Outside Seating');
  });
  const amenitiesArray = Array.from(amenities);
  const amenitiesHTML = amenitiesArray.length > 0 ? `
    <div class="shop-details-amenities">
      ${amenitiesArray.map(amenity => `<span class="shop-details-amenity">${amenity}</span>`).join('  ')}
    </div>
  ` : '';

  const coffeeIcon = `
    <svg class="text-brown-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
  `;

  shopDetailsBanner.innerHTML = `
    <button class="shop-details-close-button" aria-label="Close ${shop.name} details">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24 " stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h3 class="shop-details-heading">${coffeeIcon} ${shop.name}</h3>
    <div class="shop-details-actions" style="display: flex; gap: 10px;">
      ${shop.phone ? `
        <button id="call-button" class="floating-card-action-button" aria-label="Call ${shop.name}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          <span>Call</span>
        </button>
      ` : ''}
      ${shop.address ? `
        <button id="directions-button" class="floating-card-action-button" aria-label="Get directions to ${shop.name}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span>Directions</span>
        </button>
      ` : ''}
      ${shop.website ? `
        <button id="website-button" class="floating-card-action-button" aria-label="Visit ${shop.name} website">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          <span>Website</span>
        </button>
      ` : ''}
    </div>
    ${amenitiesHTML}
    <div class="shop-details-ratings-section">
      <h4 class="shop-details-subheading">Ratings & Reviews</h4>
      <div class="shop-details-rating-dots">${dotsHTML}</div>
      <h4 class="shop-details-subheading">Ratings Breakdown</h4>
      ${breakdownHTML}
      <p class="shop-details-total-reviews">${totalReviews} Reviews</p>
    </div>
    <div class="shop-details-reviews-section">
      <h4 class="shop-details-subheading">Reviews</h4>
      ${reviewsHTML}
    </div>
    <div class="shop-details-button-container">
      <button class="shop-details-leave-review-button" aria-label="Leave a review for ${shop.name}">
        Leave a Review
      </button>
    </div>
  `;
  shopDetailsBanner.classList.remove('hidden');
  console.log('Shop details banner classes after show:', shopDetailsBanner.classList.toString());

  // Add close button event listener
  const closeButton = shopDetailsBanner.querySelector('.shop-details-close-button');
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      shopDetailsBanner.classList.add('hidden');
      console.log('Shop details banner closed');
    });
  } else {
    console.error('Close button not found in shop details banner');
  }

  // Attach event listener to the "Leave a Review" button with enhanced logging
  const leaveReviewButton = shopDetailsBanner.querySelector('.shop-details-leave-review-button');
  if (leaveReviewButton) {
    console.log('Leave a Review button found, attaching click event listener');
    leaveReviewButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Leave a Review button clicked');
      if (shop) {
        console.log('Shop data available:', shop);
        currentShop = shop;
        try {
          showReviewBanner(shop);
          console.log('showReviewBanner called successfully');
          shopDetailsBanner.classList.add('hidden');
          console.log('Shop details banner hidden after opening review banner');
        } catch (error) {
          console.error('Error while calling showReviewBanner:', error);
        }
      } else {
        console.error('No shop data available for leaving a review. Current shop:', currentShop);
      }
    });
  } else {
    console.error('Leave a review button not found after rendering shop details');
  }

  // Add call button listener
  const callButton = shopDetailsBanner.querySelector('#call-button');
  if (callButton) {
    callButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shop && shop.phone) {
        console.log('Initiating call for:', shop.name);
        window.location.href = `tel:${shop.phone}`;
      }
    });
  }

  // Add directions button listener
  const directionsButton = shopDetailsBanner.querySelector('#directions-button');
  if (directionsButton) {
    directionsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shop && shop.address) {
        console.log('Getting directions for:', shop.name);
        const encodedAddress = encodeURIComponent(shop.address);
        const mapsUrl = `geo:0,0?q=${encodedAddress}`;
        window.location.href = mapsUrl;
      }
    });
  }

  // Add website button listener
  const websiteButton = shopDetailsBanner.querySelector('#website-button');
  if (websiteButton) {
    websiteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shop && shop.website) {
        console.log('Opening website for:', shop.name);
        window.open(shop.website, '_blank');
      }
    });
  }

  // Ensure reviews track is scrollable
  const reviewsTrack = shopDetailsBanner.querySelector('.shop-details-reviews-track');
  if (reviewsTrack) {
    let isDragging = false;
    let startX;
    let scrollLeft;

    reviewsTrack.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.pageX - reviewsTrack.offsetLeft;
      scrollLeft = reviewsTrack.scrollLeft;
      reviewsTrack.style.cursor = 'grabbing';
    });

    reviewsTrack.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - reviewsTrack.offsetLeft;
      const walk = (x - startX) * 1.5; // Adjust scroll speed
      reviewsTrack.scrollLeft = scrollLeft - walk;
    });

    reviewsTrack.addEventListener('mouseup', () => {
      isDragging = false;
      reviewsTrack.style.cursor = 'grab';
    });

    reviewsTrack.addEventListener('mouseleave', () => {
      isDragging = false;
      reviewsTrack.style.cursor = 'grab';
    });
  }
}

    function showReviewBanner(shop) {
  if (!shop || !shop.name) {
    console.warn('Attempted to show review banner with invalid shop data:', shop);
    document.getElementById('review-banner')?.classList.add('hidden');
    return;
  }
  console.log('Showing review banner for:', shop.name);

  const reviewBanner = document.getElementById('review-banner');
  if (!reviewBanner) {
    console.error('Review banner element not found');
    return;
  }

  reviewBanner.innerHTML = `
    <button class="review-banner-close-button" aria-label="Close review form for ${shop.name}">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h3 id="shop-name" class="review-banner-heading">Leave a Review for ${shop.name}</h3>
    <p class="review-banner-instruction">Select a rating</p>
    <div id="rating-container" class="review-banner-rating-container">
      ${Array.from({ length: 10 }, (_, i) => `
        <button type="button" class="review-banner-rating-button">${i + 1}</button>
      `).join('')}
    </div>
    <textarea id="review-text" class="review-banner-textarea" placeholder="Write your review..." required></textarea>
    <div class="review-banner-checkbox-container">
      <label class="review-banner-checkbox-label">
        <input id="review-parking" type="checkbox" class="review-banner-checkbox"> Parking
      </label>
      <label class="review-banner-checkbox-label">
        <input id="review-pet-friendly" type="checkbox" class="review-banner-checkbox"> Pet Friendly
      </label>
      <label class="review-banner-checkbox-label">
        <input id="review-outside-seating" type="checkbox" class="review-banner-checkbox"> Outside Seating
      </label>
    </div>
    <div class="review-banner-actions">
      <button id="review-cancel-button" class="review-banner-cancel-button">Cancel</button>
      <button id="submit-review-button" class="review-banner-submit-button">Submit</button>
    </div>
  `;
  reviewBanner.classList.remove('hidden');
  console.log('Review banner classes after show:', reviewBanner.classList.toString());
  setTimeout(() => {
    console.log('Review banner display style after delay:', window.getComputedStyle(reviewBanner).display);
  }, 100);

  // Prevent clicks inside review banner from closing it
  reviewBanner.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const ratingButtons = reviewBanner.querySelectorAll('#rating-container button');
  let selectedRating = null;
  ratingButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      ratingButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      selectedRating = parseInt(button.textContent);
      console.log('Rating selected:', selectedRating);
    });
  });

  reviewBanner.querySelector('.review-banner-close-button')?.addEventListener('click', (e) => {
    e.stopPropagation();
    reviewBanner.classList.add('hidden');
    console.log('Review banner closed');
  });

  reviewBanner.querySelector('#review-cancel-button')?.addEventListener('click', (e) => {
    e.stopPropagation();
    reviewBanner.classList.add('hidden');
    console.log('Review banner cancelled');
  });

  reviewBanner.querySelector('#submit-review-button')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const reviewText = reviewBanner.querySelector('#review-text').value.trim();
    const parking = reviewBanner.querySelector('#review-parking').checked;
    const petFriendly = reviewBanner.querySelector('#review-pet-friendly').checked;
    const outsideSeating = reviewBanner.querySelector('#review-outside-seating').checked;

    if (!selectedRating) {
      alert('Please select a rating.');
      return;
    }
    if (!reviewText) {
      alert('Please write a review.');
      return;
    }

    const review = {
      userId: currentUser,
      shopName: shop.name,
      rating: selectedRating,
      text: reviewText,
      parking: parking,
      petFriendly: petFriendly,
      outsideSeating: outsideSeating,
      date: new Date().toISOString()
    };

    const shopReviews = JSON.parse(localStorage.getItem(`reviews-${shop.name}`)) || [];
    shopReviews.push(review);
    localStorage.setItem(`reviews-${shop.name}`, JSON.stringify(shopReviews));

    console.log('Review submitted:', review);
    reviewBanner.classList.add('hidden');
    showShopDetails(shop);
  });
}

    function shareShop(shop) {
      if (navigator.share) {
        navigator.share({
          title: shop.name,
          text: `Check out ${shop.name} at ${shop.address}!`,
          url: shop.website || window.location.href
        }).then(() => {
          console.log('Shop shared successfully:', shop.name);
        }).catch(error => {
          console.error('Error sharing shop:', error);
        });
      } else {
        console.warn('Web Share API not supported, falling back to clipboard');
        const shareText = `${shop.name} at ${shop.address} (${shop.website || 'No website'})`;
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Shop details copied to clipboard!');
        }).catch(error => {
          console.error('Error copying to clipboard:', error);
        });
      }
    }

    const filtersButton = document.querySelector('.filters-button');
    if (filtersButton) {
      filtersButton.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('Filters button clicked');
        const filtersModal = document.getElementById('filters-modal');
        if (filtersModal) {
          document.querySelectorAll('#cities-modal, #top100-modal, #favorite-modal').forEach(m => m.classList.add('hidden'));
          filtersModal.classList.remove('hidden');
          console.log('Filters modal state:', filtersModal.classList.contains('hidden') ? 'hidden' : 'visible');
        } else {
          console.error('Filters modal not found in DOM');
        }
      });
    } else {
      console.error('Filters button not found in DOM');
    }

    window.applyFilters = function() {
      const parkingCheckbox = document.getElementById('filter-parking');
      const petFriendlyCheckbox = document.getElementById('filter-pet-friendly');
      const specialtyCoffeeCheckbox = document.getElementById('filter-specialty-coffee');

      filterState.parking = parkingCheckbox ? parkingCheckbox.checked : false;
      filterState.petFriendly = petFriendlyCheckbox ? petFriendlyCheckbox.checked : false;
      filterState.specialtyCoffee = specialtyCoffeeCheckbox ? specialtyCoffeeCheckbox.checked : false;

      console.log('Applying filters:', filterState);
      fetchFilteredShops();
      document.getElementById('filters-modal').classList.add('hidden');
    };

    function fetchFilteredShops() {
      if (!placesService) {
        console.error('PlacesService not initialized');
        return;
      }

      const location = userLocation || map.getCenter();
      const latLng = new google.maps.LatLng(location.lat, location.lng);

      let query = 'coffee shop';
      if (filterState.parking) query += ' parking';
      if (filterState.petFriendly) query += ' pet friendly';
      if (filterState.specialtyCoffee) query += ' specialty coffee';

      const request = {
        query: query,
        location: latLng,
        radius: 5000,
        type: 'cafe'
      };

      console.log('Fetching shops with request:', request);
      placesService.textSearch(request, (results, status) => {
        console.log('Text search status:', status);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          console.log('Filtered shops:', results);
          results.forEach(result => {
            const existingShop = shops.find(shop => shop.placeId === result.place_id);
            if (!existingShop) {
              const shopReviews = reviews.filter(r => r.shopName === result.name);
              shops.push({
                placeId: result.place_id,
                name: result.name || 'Unknown Shop',
                city: extractCityFromAddressComponents(result.address_components),
                petFriendly: shopReviews.some(r => r.petFriendly) || false,
                parking: shopReviews.some(r => r.parking) || false,
                outsideSeating: shopReviews.some(r => r.outsideSeating) || false,
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
                address: result.formatted_address || 'No address available',
                website: result.website || 'No website available',
                phone: result.formatted_phone_number || 'No phone number available'
              });
            }
          });
          displayFilteredShops(results);
        } else {
          console.error('Failed to fetch filtered shops:', status);
          document.getElementById('filtered-shops-list').innerHTML = '<p>No shops found.</p>';
        }
      });
    }

    function displayFilteredShops(shops) {
    const filteredShopsList = document.getElementById('filtered-shops-list');
    if (!filteredShopsList) {
      console.error('Filtered shops list element not found in DOM');
      return;
    }

    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];

    filteredShopsList.innerHTML = '';

    if (shops.length === 0) {
      filteredShopsList.innerHTML = '<p>No shops match your filters.</p>';
      return;
    }

    shops.forEach(shop => {
      const listItem = document.createElement('div');
      listItem.className = 'p-2 hover:bg-gray-100 cursor-pointer';
      listItem.innerHTML = `
        <h3 class="font-bold">${shop.name || 'Unknown Shop'}</h3>
        <p class="text-sm text-gray-500">${shop.formatted_address || 'No address'}</p>
        <p class="text-sm text-gray-500">Rating: ${shop.rating || 'N/A'}</p>
      `;
      listItem.addEventListener('click', () => {
        console.log('Filtered shop clicked:', shop.name);
        const lat = shop.geometry.location.lat();
        const lng = shop.geometry.location.lng();
        map.setView([lat, lng], 15);
        // Use coffeeIcon for filtered shop marker
        const marker = L.marker([lat, lng], { icon: coffeeIcon })
          .addTo(map)
          .bindPopup(shop.name)
          .openPopup();
        currentMarkers.push(marker);

        currentShop = {
          name: shop.name || 'Unknown Shop',
          rating: shop.rating ? shop.rating + ' / 5' : 'N/A',
          address: shop.formatted_address || 'No address available',
          website: shop.website || 'No website available',
          phone: shop.formatted_phone_number || 'No phone number available',
          features: {
            parking: reviews.some(r => r.parking && r.shopName === shop.name) || false,
            petFriendly: reviews.some(r => r.petFriendly && r.shopName === shop.name) || false,
            specialtyCoffee: reviews.some(r => r.specialtyCoffee && r.shopName === shop.name) || false
          },
          lat: lat,
          lng: lng,
          city: extractCityFromAddressComponents(shop.address_components)
        };
        console.log('currentShop set from filtered shop:', currentShop);
        showFloatingCard(currentShop);
      });
      filteredShopsList.appendChild(listItem);
    });
  }

  let selectedRatingFilter = 'all';

  const ratingButtons = document.querySelectorAll('#cities-modal button[id*="rating"]');
  ratingButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      selectedRatingFilter = button.textContent.toLowerCase().replace('+', '');
      console.log('Rating filter selected:', selectedRatingFilter);
      ratingButtons.forEach(btn => btn.classList.remove('bg-blue-500', 'text-white'));
      button.classList.add('bg-blue-500', 'text-white');
      const activeCity = document.querySelector('#cities-modal .city-button')?.textContent.toLowerCase().trim() || 'paris';
      fetchShopsByCity(activeCity, selectedRatingFilter);
    });
  });

  function fetchShopsByCity(city, ratingFilter) {
    if (!placesService) {
      console.error('PlacesService not initialized');
      return;
    }

    const [lat, lng] = cityCoordinates[city] || [48.8566, 2.3522];
    const latLng = new google.maps.LatLng(lat, lng);

    const request = {
      query: 'coffee shop',
      location: latLng,
      radius: 5000,
      type: 'cafe'
    };

    console.log('Fetching shops for city:', city, 'with request:', request);
    placesService.textSearch(request, (results, status) => {
      console.log('Text search status for city:', status);
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        let filteredResults = results;
        if (ratingFilter !== 'all') {
          const minRating = parseFloat(ratingFilter);
          filteredResults = results.filter(shop => shop.rating >= minRating);
        }

        console.log(`Filtered shops for ${city} (rating ${ratingFilter}+):`, filteredResults);
        shops = filteredResults.map(result => ({
          placeId: result.place_id,
          name: result.name || 'Unknown Shop',
          city: extractCityFromAddressComponents(result.address_components),
          petFriendly: reviews.some(r => r.petFriendly && r.shopName === result.name) || false,
          parking: reviews.some(r => r.parking && r.shopName === result.name) || false,
          outsideSeating: reviews.some(r => r.outsideSeating && r.shopName === result.name) || false,
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          address: result.formatted_address || 'No address available',
          website: result.website || 'No website available',
          phone: result.formatted_phone_number || 'No phone number available',
          rating: result.rating || 0
        }));

        // Clear existing markers
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];

        // Add markers for each shop using coffeeIcon
        shops.forEach(shop => {
          const marker = L.marker([shop.lat, shop.lng], { icon: coffeeIcon })
            .addTo(map)
            .bindPopup(shop.name);
          marker.on('click', () => {
            console.log('Marker clicked for:', shop.name);
            currentShop = shop;
            showFloatingCard(shop);
          });
          currentMarkers.push(marker);
        });

        displayFilteredShops(filteredResults);
      } else {
        console.error('Failed to fetch shops for city:', status);
        document.getElementById('filtered-shops-list').innerHTML = '<p>No shops found.</p>';
      }
    });
  }

    function displayTop100Shops() {
  console.log('Displaying top 100 shops');
  const top100List = document.getElementById('top100-list');
  if (!top100List) {
    console.error('Top 100 list element not found');
    return;
  }

  const allShops = [];
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('reviews-')) {
      const shopName = key.replace('reviews-', '');
      const reviews = JSON.parse(localStorage.getItem(key)) || [];
      if (reviews.length > 0) {
        const averageRating = reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length;
        allShops.push({ name: shopName, averageRating, reviews });
      }
    }
  });

  allShops.sort((a, b) => b.averageRating - a.averageRating);
  const topShops = allShops.slice(0, 100);

  if (topShops.length === 0) {
    top100List.innerHTML = '<p class="top100-modal-loading">No rated shops available.</p>';
    console.log('No top shops to display');
    return;
  }

  top100List.className = 'top100-modal-list';
  top100List.innerHTML = '';

  topShops.forEach(shop => {
    const isFavorited = favorites.some(fav => fav.name === shop.name);
    const li = document.createElement('li');
    li.className = 'top100-modal-list-item';
    li.innerHTML = `
      <div class="top100-modal-shop-info">
        <svg class="top100-modal-star-icon text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 .587l3.668 7.431 8.332 1.151-6.001 5.822 1.417 8.262L12 18.707l-7.416 3.504 1.417-8.262-6.001-5.822 8.332-1.151z"/>
        </svg>
        ${shop.name} (${shop.averageRating.toFixed(1)}/10)
      </div>
      <div class="top100-modal-actions">
        <button class="top100-modal-button view-shop" aria-label="View ${shop.name}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button class="top100-modal-button favorite-shop ${isFavorited ? 'favorited' : ''}" aria-label="${isFavorited ? `Remove ${shop.name} from favorites` : `Add ${shop.name} to favorites`}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="${isFavorited ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    `;
    top100List.appendChild(li);
  });

  // Remove any existing listeners to avoid duplicates
  top100List.removeEventListener('click', handleTop100ButtonClick);

  // Add a single delegated event listener to top100List
  top100List.addEventListener('click', handleTop100ButtonClick);
  console.log('Attached delegated click listener to top100List');
}

// Delegated event handler for view and favorite buttons
function handleTop100ButtonClick(e) {
  const target = e.target.closest('.top100-modal-button');
  if (!target) return;

  e.stopPropagation();
  const shopName = target.parentElement.parentElement.querySelector('.top100-modal-shop-info').textContent.split('(')[0].trim();
  const shop = shops.find(s => s.name === shopName);

  if (target.classList.contains('view-shop')) {
    if (shop) {
      console.log('Viewing shop from Top 100:', shopName);
      currentShop = shop;
      try {
        showShopDetails(shop);
        console.log('Shop details banner shown for:', shop.name);
        document.getElementById('top100-modal').classList.add('hidden');
        console.log('Top 100 modal hidden');
      } catch (error) {
        console.error('Error showing shop details:', error);
      }
    } else {
      console.error('Shop not found in shops array:', shopName);
      console.log('Available shops:', shops.map(s => s.name));
    }
  } else if (target.classList.contains('favorite-shop')) {
    if (shop) {
      const isCurrentlyFavorited = favorites.some(fav => fav.name === shop.name);
      if (isCurrentlyFavorited) {
        favorites = favorites.filter(fav => fav.name !== shop.name);
        target.classList.remove('favorited');
        target.querySelector('svg').setAttribute('fill', 'none');
        target.setAttribute('aria-label', `Add ${shop.name} to favorites`);
        console.log('Removed from favorites:', shop.name);
      } else {
        addToFavorites(shop);
        target.classList.add('favorited');
        target.querySelector('svg').setAttribute('fill', 'currentColor');
        target.setAttribute('aria-label', `Remove ${shop.name} from favorites`);
        console.log('Added to favorites:', shop.name);
      }
      updateFavoritesModal();
    } else {
      console.error('Shop not found for favoriting:', shopName);
    }
  }
}

// Ensure displayTop100Shops is called when the modal is opened
document.getElementById('top-100-button').addEventListener('click', () => {
  document.getElementById('top100-modal').classList.remove('hidden');
  displayTop100Shops(); // Re-render and reattach listeners
});

    function updateTop100Display(topShops, filterState) {
      const shopListContainer = document.getElementById('top100-shop-list');
      if (!shopListContainer) {
        console.error('Top 100 shop list container not found');
        return;
      }

      let filteredShops = [...topShops];
      if (filterState.parking || filterState.outsideSeating || filterState.petFriendly) {
        filteredShops = topShops.filter(shop => {
          return (!filterState.parking || shop.parking) &&
                 (!filterState.outsideSeating || shop.outsideSeating) &&
                 (!filterState.petFriendly || shop.petFriendly);
        });
      }

      shopListContainer.innerHTML = filteredShops.length > 0
        ? filteredShops.map((shop, index) => `
            <div class="p-2 hover:bg-gray-100 cursor-pointer top100-shop" data-name="${shop.name}">
              <span>${index + 1}. ${shop.name}</span>
              <span>Rating: ${shop.avgRating.toFixed(1)}/10</span>
              <span>${shop.parking ? 'Parking ' : ''}${shop.outsideSeating ? 'Outdoor ' : ''}${shop.petFriendly ? 'Pet ' : ''}</span>
            </div>
          `).join('')
        : '<p>No shops match the selected filters.</p>';

      document.querySelectorAll('.top100-shop').forEach(item => {
        item.addEventListener('click', () => {
          const shopName = item.getAttribute('data-name');
          const shop = shops.find(s => s.name === shopName) || { name: shopName, rating: `${topShops.find(s => s.name === shopName).avgRating}/10` };
          console.log('Top 100 shop clicked:', shopName);
          currentShop = shop;
          showFloatingCard(shop);
        });
      });
    }

  } catch (error) {
    console.error('Error initializing map:', error);
    document.getElementById('map')?.classList.add('map-failed');
  }
}, false);