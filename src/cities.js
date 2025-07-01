import { getMapInstance } from './map.js';
import { loadFavorites } from './favorites.js';
import supabase from './supabase.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;


const map = getMapInstance();
let favorites = [];

async function initCities() {
  try {
    favorites = await loadFavorites();
  } catch (error) {
    console.error('Error initializing cities:', error);
  }
}


console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey);

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

// Fetch distinct city names matching the search query (case-insensitive)
export async function fetchCities(searchQuery = '') {
  console.log('Fetching cities with query:', searchQuery);
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('city')
      .ilike('city', `%${searchQuery}%`);

    if (error) throw error;
    if (!shops) return [];

    // Use a Set to remove duplicates (case-insensitive)
    const citySet = new Set();
    shops.forEach(shop => {
      if (shop.city) citySet.add(shop.city.toLowerCase());
    });

    const cities = Array.from(citySet).sort();

    console.log('Cities fetched successfully:', cities);
    return cities;
  } catch (error) {
  console.error('Error fetching cities:', error);
  showError('Failed to load cities. Please try again.');
  return [];
}
}

// Fetch shops filtered by city (case-insensitive)
export async function fetchShopsByCity(city) {
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id, name, address, city, lat, lng')
      .ilike('city', city);

    if (error) throw error;
    return shops || [];
  } catch (error) {
  console.error(`Error fetching shops for city ${city}:`, error);
  showError(`Failed to load shops for ${city}.`);
  return [];
}
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
      const shops = await fetchShopsByCity(city);
      renderShopResults(shops);
    });

    citySuggestions.appendChild(suggestionItem);
  });
}

export function renderShopResults(shops) {
  const cityButtonsContainer = document.getElementById('city-buttons');
  if (!cityButtonsContainer) return;

  // Remove old results container if present
  const existingResults = cityButtonsContainer.querySelector('.shop-results');
  if (existingResults) existingResults.remove();

  const shopResultsContainer = document.createElement('div');
  shopResultsContainer.className = 'shop-results mt-2';

  if (!shops || shops.length === 0) {
    shopResultsContainer.innerHTML = '<p class="text-gray-500 p-2">No shops found for this city.</p>';
  } else {
    shopResultsContainer.innerHTML = `
      <h4 class="section-title text-sm font-semibold mb-1">Shops</h4>
      <ul class="cities-modal-shops-list flex gap-2 overflow-x-auto"></ul>
    `;

    const list = shopResultsContainer.querySelector('.cities-modal-shops-list');

    shops.forEach(shop => {
      const isFavorited = favorites.some(fav => fav.shop_id === shop.id);
      const li = document.createElement('li');
      li.className = 'top100-modal-list-item';
      li.innerHTML = `
        <div class="top100-modal-shop-info">
          <svg class="top100-modal-star-icon text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 .587l3.668 7.431 8.332 1.151-6.001 5.822 1.417 8.262L12 18.707l-7.416 3.504 1.417-8.262-6.001-5.822 8.332-1.151z"/>
          </svg>
          ${shop.name} (${shop.city})
        </div>
        <div class="top100-modal-actions">
          <button class="top100-modal-button view-shop" data-shop-id="${shop.id}" aria-label="View ${shop.name}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button class="top100-modal-button favorite-shop ${isFavorited ? 'favorited' : ''}" data-shop-id="${shop.id}" aria-label="${isFavorited ? `Remove ${shop.name} from favorites` : `Add ${shop.name} to favorites`}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${isFavorited ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      `;
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
