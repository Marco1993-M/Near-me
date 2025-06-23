import { displayTop100Shops } from './top100.js';
import { initFavorites, updateFavoritesModal } from './favorites.js';
import { showShopDetails } from './shopdetails.js'; // <-- Make sure path is correct

export function initModals(supabase) {
  const modals = [
    { triggerId: 'cities-button', modalId: 'cities', closeClass: 'close-cities-modal' },
    { triggerId: 'top-100-button', modalId: 'top100', closeClass: 'top100-modal-close-button' },
    { triggerId: 'favorites-button', modalId: 'favorites', closeClass: 'favorite-modal-close-button' }
  ];

  modals.forEach(({ triggerId, modalId, closeClass }) => {
    const trigger = document.getElementById(triggerId);
    const modal = document.getElementById(modalId);
    const close = modal?.querySelector(`.${closeClass}`);

    if (trigger && modal) {
      trigger.addEventListener('click', async () => {
        console.log(`Opening modal: ${modalId}`);
        modal.classList.remove('hidden');
        if (modalId === 'top100') {
          await displayTop100Shops();
        } else if (modalId === 'favorites') {
          await updateFavoritesModal();
        }
      });
    } else {
      console.error(`Trigger (${triggerId}) or modal (${modalId}) not found`);
    }

    if (close && modal) {
      close.addEventListener('click', () => {
        console.log(`Closing modal: ${modalId}`);
        modal.classList.add('hidden');
      });
    } else {
      console.error(`Close button (.${closeClass}) not found in modal (${modalId})`);
    }
  });

  // Floating card close button
  const floatingCard = document.getElementById('floating-card');
  const closeFloating = floatingCard?.querySelector('.floating-card-close-button');
  if (closeFloating && floatingCard) {
    closeFloating.addEventListener('click', () => {
      console.log('Closing floating card');
      floatingCard.classList.add('hidden');
    });
  }

  // --- Render shop results inside cities modal ---
  function renderShopResults(shops) {
    const cityButtonsContainer = document.getElementById('city-buttons');
    if (!cityButtonsContainer) return;

    const existingResults = cityButtonsContainer.querySelector('.shop-results');
    if (existingResults) existingResults.remove();

    const shopResultsContainer = document.createElement('div');
    shopResultsContainer.className = 'shop-results mt-2';
    shopResultsContainer.style.maxHeight = '300px';
    shopResultsContainer.style.overflowY = 'auto';

    if (!shops || shops.length === 0) {
      shopResultsContainer.innerHTML = '<p class="text-gray-500 p-2">No shops found for this city.</p>';
    } else {
      shopResultsContainer.innerHTML = `
        <h4 class="section-title text-sm font-semibold mb-1">Shops</h4>
        <ul class="cities-modal-shops-list flex flex-col gap-2 overflow-y-auto"></ul>
      `;

      const list = shopResultsContainer.querySelector('.cities-modal-shops-list');

      shops.forEach(shop => {
        const li = document.createElement('li');
        li.className = 'top100-modal-list-item cursor-pointer';
        li.textContent = `${shop.name} (${shop.city}) — ${shop.address}`;

        li.addEventListener('click', () => {
          showShopDetails(shop);
          document.getElementById('cities')?.classList.add('hidden'); // hide modal
        });

        list.appendChild(li);
      });
    }

    cityButtonsContainer.appendChild(shopResultsContainer);
  }

  // --- CITY SEARCH ---
  const citySearchInput = document.getElementById('city-search');
  const citySuggestions = document.getElementById('city-suggestions');

  if (citySearchInput && citySuggestions) {
    citySearchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim();
      if (!query) {
        citySuggestions.classList.add('hidden');
        citySuggestions.innerHTML = '';
        return;
      }

      try {
        const { data, error } = await supabase
          .from('shops')
          .select('city')
          .ilike('city', `%${query}%`)
          .limit(10);

        if (error) {
          console.error('Supabase city search error:', error);
          citySuggestions.classList.add('hidden');
          return;
        }

        const uniqueCities = [...new Set(data.map(d => d.city.toLowerCase()))];
        citySuggestions.innerHTML = uniqueCities
          .map(city => `<div class="city-suggestion-item cursor-pointer px-3 py-1 hover:bg-gray-200">${city.charAt(0).toUpperCase() + city.slice(1)}</div>`)
          .join('');
        citySuggestions.classList.remove('hidden');

        citySuggestions.querySelectorAll('.city-suggestion-item').forEach(item => {
          item.addEventListener('click', async () => {
            const selectedCity = item.textContent;
            citySearchInput.value = selectedCity;
            citySuggestions.classList.add('hidden');

            try {
              const { data: shops, error: shopsError } = await supabase
                .from('shops')
                .select('id, name, address, city, lat, lng')
                .ilike('city', selectedCity);

              if (shopsError) {
                console.error(`Error fetching shops for city ${selectedCity}:`, shopsError);
                return;
              }

              renderShopResults(shops);

              const citiesModal = document.getElementById('cities');
              if (citiesModal && citiesModal.classList.contains('hidden')) {
                citiesModal.classList.remove('hidden');
              }
            } catch (err) {
              console.error('Error fetching shops:', err);
            }
          });
        });
      } catch (err) {
        console.error('Error fetching cities:', err);
        citySuggestions.classList.add('hidden');
      }
    });

    document.addEventListener('click', (event) => {
      if (!citySuggestions.contains(event.target) && event.target !== citySearchInput) {
        citySuggestions.classList.add('hidden');
      }
    });
  } else {
    console.warn('City search input or suggestions container not found');
  }
}
