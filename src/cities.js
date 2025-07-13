import { getMapInstance } from './map.js';
import { loadFavorites } from './favorites.js';
import { showFloatingCard } from './shops.js';
import { getOrCreateShop } from './db.js';
import supabase from './supabase.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

const map = getMapInstance();
let favorites = [];
let cityMarkers = [];

const redditCorsProxy = 'https://cors-anywhere.herokuapp.com/';

async function initCities() {
  try {
    favorites = await loadFavorites();
  } catch (error) {
    console.error('Error initializing cities:', error);
  }
}

initCities();

function showError(message) {
  const cityButtonsContainer = document.getElementById('city-buttons');
  if (!cityButtonsContainer) return;
  const errorDiv = document.createElement('div');
  errorDiv.className = 'text-red-500 p-2 mb-2';
  errorDiv.textContent = message;
  cityButtonsContainer.prepend(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

export async function fetchCities(searchQuery = '') {
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('city')
      .ilike('city', `%${searchQuery}%`);

    if (error) throw error;
    if (!shops) return [];

    const citySet = new Set();
    shops.forEach(shop => {
      if (shop.city) citySet.add(shop.city.toLowerCase());
    });

    return Array.from(citySet).sort();
  } catch (error) {
    console.error('Error fetching cities:', error);
    showError('Failed to load cities. Please try again.');
    return [];
  }
}

export async function fetchTrendingShops(city) {
  // Fetch Google Places shops (top 5 by rating)
  const googleShops = await new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const request = { query: `${city} coffee`, type: 'cafe' };
    const mapInstance = getMapInstance();
    const userLatLng = mapInstance?.map?.getCenter();
    if (userLatLng) {
      request.location = new google.maps.LatLng(userLatLng.lat, userLatLng.lng);
      request.radius = 5000;
    }
    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const sorted = results.filter(s => s.rating).sort((a, b) => b.rating - a.rating);
        resolve(sorted.slice(0, 5));
      } else {
        console.error(`PlacesService textSearch failed for ${city}:`, status);
        showError(`Failed to load trending shops for ${city}.`);
        resolve([]);
      }
    });
  });

  // Fetch Reddit posts related to speciality coffee
  const redditPosts = await fetchRedditPosts(city);

  // Map Reddit posts to shop-like objects with a `isReddit` flag and a keyword label
  const redditShops = redditPosts.map(post => ({
    place_id: `reddit-${post.data.id}`, // unique id prefixed with reddit-
    name: post.data.title,
    url: `https://reddit.com${post.data.permalink}`,
    isReddit: true,
    keyword: 'reddit',
    geometry: {
      location: {
        lat: () => 0, // Reddit posts don’t have geo, so default lat/lng zero
        lng: () => 0,
      }
    },
    formatted_address: '',
    address_components: [],
    formatted_phone_number: null,
  }));

  // Combine Google and Reddit results
  return [...googleShops, ...redditShops];
}

async function fetchRedditPosts(city) {
  try {
    const query = encodeURIComponent(`${city} specialty coffee`);
    const redditUrl = `https://www.reddit.com/r/Coffee/search.json?q=${query}&restrict_sr=1&sort=relevance&t=all&limit=5`;
    const response = await fetch(redditCorsProxy + redditUrl);
    if (!response.ok) throw new Error(`Reddit fetch error: ${response.status}`);
    const json = await response.json();
    return json.data.children || [];
  } catch (error) {
    console.error('Error fetching Reddit posts:', error);
    return [];
  }
}

function extractCityFromAddressComponents(components) {
  if (!components) return 'Unknown City';
  const cityComponent = components.find(c =>
    c.types.includes('locality') || c.types.includes('administrative_area_level_2')
  );
  return cityComponent ? cityComponent.long_name.toLowerCase() : 'Unknown City';
}

async function handleCityShopClick(shop) {
  const mapInstance = getMapInstance();
  const map = mapInstance?.map;
  const coffeeIcon = mapInstance?.customIcon;

  if (!map) return;

  // Close modal
  const citiesModal = document.getElementById('cities');
  if (citiesModal) citiesModal.classList.add('hidden');

  // Clear previous markers
  cityMarkers.forEach(marker => map.removeLayer(marker));
  cityMarkers = [];

  let lat, lng;
  if (shop.isReddit) {
    // For Reddit posts, no location - just center map on city or default view
    const cityCoords = mapInstance?.map?.getCenter();
    lat = cityCoords?.lat ?? 0;
    lng = cityCoords?.lng ?? 0;
  } else {
    lat = shop.geometry.location.lat();
    lng = shop.geometry.location.lng();
  }

  // Use a special marker style for Reddit posts (e.g. orange outline)
  const markerOptions = shop.isReddit
    ? { icon: L.divIcon({ className: 'reddit-marker' }) }
    : { icon: coffeeIcon };

  const marker = L.marker([lat, lng], markerOptions)
    .addTo(map)
    .bindPopup(shop.name)
    .openPopup();

  cityMarkers.push(marker);
  map.setView([lat, lng], 15);

  const shopData = {
    name: shop.name,
    address: shop.formatted_address || '',
    lat,
    lng,
    city: extractCityFromAddressComponents(shop.address_components),
    phone: shop.formatted_phone_number || null,
    url: shop.url || null,
    isReddit: shop.isReddit,
    keyword: shop.keyword || null,
  };

  if (!shop.isReddit) {
    shopData.id = await getOrCreateShop(
      shopData.name,
      shopData.address,
      shopData.city,
      shopData.lat,
      shopData.lng
    );
  }

  await showFloatingCard(shopData);
}

export function renderCitySuggestions(cities) {
  const citySuggestions = document.getElementById('city-suggestions');
  if (!citySuggestions) return;

  citySuggestions.innerHTML = '';
  citySuggestions.classList.toggle('hidden', cities.length === 0);

  cities.forEach(city => {
    const suggestionItem = document.createElement('div');
    suggestionItem.className = 'city-suggestion-item px-3 py-1 hover:bg-gray-200 cursor-pointer';
    suggestionItem.textContent = city.charAt(0).toUpperCase() + city.slice(1);
    suggestionItem.dataset.city = city;

    suggestionItem.addEventListener('click', async () => {
      const citySearchInput = document.getElementById('city-search');
      if (citySearchInput) citySearchInput.value = suggestionItem.textContent;
      citySuggestions.classList.add('hidden');
      const shops = await fetchTrendingShops(city);
      renderShopResults(shops);
    });

    citySuggestions.appendChild(suggestionItem);
  });
}

export function renderShopResults(shops) {
  const cityButtonsContainer = document.getElementById('city-buttons');
  if (!cityButtonsContainer) return;

  const existingResults = cityButtonsContainer.querySelector('.shop-results');
  if (existingResults) existingResults.remove();

  const shopResultsContainer = document.createElement('div');
  shopResultsContainer.className = 'shop-results mt-2';

  if (!shops || shops.length === 0) {
    shopResultsContainer.innerHTML = '<p class="text-gray-500 p-2">No shops found for this city.</p>';
  } else {
    shopResultsContainer.innerHTML = `
      <h4 class="section-title text-sm font-semibold mb-1">Trending Shops</h4>
      <ul class="cities-modal-shops-list flex gap-2 overflow-x-auto"></ul>
    `;

    const list = shopResultsContainer.querySelector('.cities-modal-shops-list');

    shops.forEach(shop => {
      const li = document.createElement('li');
      li.className = 'top100-modal-list-item';
      // Add orange border if Reddit result, plus keyword label
      const redditClass = shop.isReddit ? 'reddit-outline' : '';
      const keywordLabel = shop.isReddit ? `<span class="keyword-label">reddit</span>` : '';

      li.innerHTML = `
        <div class="top100-modal-shop-info ${redditClass}">
          ${shop.name} ${keywordLabel}
        </div>
        <div class="top100-modal-actions">
          <button class="top100-modal-button view-shop" data-shop-id="${shop.place_id}" aria-label="View ${shop.name}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      `;

      li.addEventListener('click', () => handleCityShopClick(shop));
      list.appendChild(li);
    });
  }

  cityButtonsContainer.appendChild(shopResultsContainer);
}

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

document.addEventListener('DOMContentLoaded', () => {
  const citySearchInput = document.getElementById('city-search');
  const citySuggestions = document.getElementById('city-suggestions');
  const cityButtonsContainer = document.getElementById('city-buttons');
  const closeCitiesModal = document.querySelector('.close-cities-modal');
  const citiesModal = document.getElementById('cities');

  if (citySearchInput && citySuggestions && cityButtonsContainer && citiesModal) {
    citySearchInput.addEventListener(
      'input',
      debounce(async () => {
        const searchQuery = citySearchInput.value.trim().toLowerCase();

        if (searchQuery.length === 0) {
          citySuggestions.classList.add('hidden');
          const shopResults = cityButtonsContainer.querySelector('.shop-results');
          if (shopResults) shopResults.remove();
          return;
        }

        const cities = await fetchCities(searchQuery);
        renderCitySuggestions(cities);
      }, 300)
    );

    citySearchInput.addEventListener('change', () => {
      if (!citySearchInput.value.trim()) {
        citySuggestions.classList.add('hidden');
        const shopResults = cityButtonsContainer.querySelector('.shop-results');
        if (shopResults) shopResults.remove();
      }
    });

    closeCitiesModal.addEventListener('click', () => {
      citiesModal.classList.add('hidden');
      citySuggestions.classList.add('hidden');
      const shopResults = cityButtonsContainer.querySelector('.shop-results');
      if (shopResults) shopResults.remove();
      console.log('Cities modal closed');
    });
  } else {
    console.error('One or more city modal elements not found');
  }
});
