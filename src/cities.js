import { getMapInstance } from './map.js';
import { loadFavorites } from './favorites.js';

const googleMapsApiKey = 'AIzaSyB6PCrEeC-cr9YRt_DX-iil3MbLX845_ps';

const map = getMapInstance();
let favorites = [];

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

// Fetch city suggestions using Google Maps Places API
export async function fetchCitySuggestions(searchQuery = '') {
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${searchQuery}&key=${googleMapsApiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.predictions.map(prediction => prediction.description);
  } catch (error) {
    console.error('Error fetching city suggestions:', error);
    showError('Failed to load city suggestions. Please try again.');
    return [];
  }
}

// Fetch trending shops in a city using Google Maps Places API
export async function fetchTrendingShops(city) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${city}+coffee&key=${googleMapsApiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error(`Error fetching trending shops for ${city}:`, error);
    showError(`Failed to load trending shops for ${city}.`);
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
    suggestionItem.textContent = city;
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

  // Remove old results container if present
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
      li.innerHTML = `
        <div class="top100-modal-shop-info">
          ${shop.name}
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
        const searchQuery = citySearchInput.value.trim();

        if (searchQuery.length === 0) {
          citySuggestions.classList.add('hidden');
          const shopResults = cityButtonsContainer.querySelector('.shop-results');
          if (shopResults) shopResults.remove();
          return;
        }

        const cities = await fetchCitySuggestions(searchQuery);
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
