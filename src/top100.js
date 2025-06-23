import supabase from './supabase.js';
import { loadFavorites, addToFavorites, removeFromFavorites, updateFavoritesModal } from './favorites.js';
import { showShopDetails } from './shopdetails.js';
import { getOrCreateShop } from './db.js';



let favorites = [];
let currentShop = null;
let processedShops = [];

async function init() {
  try {
    favorites = await loadFavorites();
  } catch (error) {
    console.error('Error loading favorites:', error);
  }
}

init();

export async function displayTop100Shops() {
  console.log('displayTop100Shops function called');
  const top100List = document.getElementById('top100-list');
  if (!top100List) {
    console.error('Top 100 list element not found');
    return;
  }

  top100List.innerHTML = '<p class="top100-modal-loading">Loading top shops...</p>';

  try {
    const { data: topShops, error } = await supabase
      .from('shops')
      .select(`
        id,
        name,
        address,
        city,
        lat,
        lng,
        reviews (
          rating
        )
      `)
      .limit(100);

    if (error) {
      console.error('Error fetching top shops:', error);
      top100List.innerHTML = '<p class="top100-modal-loading">Error loading top shops.</p>';
      return;
    }

    processedShops = topShops
      .map(shop => {
        const reviews = shop.reviews || [];
        const averageRating =
          reviews.length > 0
            ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
            : 0;
        return {
          id: shop.id,
          name: shop.name,
          address: shop.address,
          city: shop.city,
          lat: shop.lat,
          lng: shop.lng,
          averageRating,
          reviewCount: reviews.length,
        };
      })
      .filter(shop => shop.reviewCount > 0)
      .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
      .slice(0, 100);

    if (processedShops.length === 0) {
      top100List.innerHTML = '<p class="top100-modal-loading">No rated shops available.</p>';
      console.log('No top shops to display');
      return;
    }

    top100List.className = 'top100-modal-list';
    top100List.innerHTML = '';

    processedShops.forEach(shop => {
      const isFavorited = Array.isArray(favorites) && favorites.some(fav => fav.shop_id === shop.id);
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
      top100List.appendChild(li);
    });

    top100List.removeEventListener('click', handleTop100ButtonClick);
    top100List.addEventListener('click', handleTop100ButtonClick);

  } catch (error) {
    console.error('Error in displayTop100Shops:', error);
    top100List.innerHTML = '<p class="top100-modal-loading">Error loading top shops.</p>';
  }
}

function handleTop100ButtonClick(e) {
  const target = e.target.closest('.top100-modal-button');
  if (!target) return;

  e.stopPropagation();

  const shopId = target.dataset.shopId;
  if (!shopId) return;

  const shopItem = target.closest('.top100-modal-list-item');
  if (!shopItem) return;

  const shopName = shopItem.querySelector('.top100-modal-shop-info')?.textContent?.trim().split(' (')[0];
  if (!shopName) return;

  function isFavorited(shopId) {
    return favorites.some(fav => fav.shop_id === shopId);
  }

  if (target.classList.contains('view-shop')) {
    console.log(`Viewing shop ${shopName} with ID ${shopId}`);
    const shopInfo = processedShops.find(shop => shop.id === shopId);
    currentShop = { ...shopInfo };
    if (typeof showShopDetails === 'function') {
      showShopDetails(currentShop);

      // ✅ Close the modal after showing the details
      const top100Modal = document.getElementById('top100');
      if (top100Modal?.close) {
        top100Modal.close();
        console.log('Top 100 modal closed after viewing shop');
      }
    }
  } else if (target.classList.contains('favorite-shop')) {
    (async () => {
      let shopInfo = processedShops.find(shop => shop.id === shopId);
      if (!shopInfo) {
        console.warn(`Shop info not found for ID ${shopId}`);
        return;
      }

      try {
        const resolvedShopId = await getOrCreateShop(
          shopInfo.name,
          shopInfo.address,
          shopInfo.city,
          shopInfo.lat,
          shopInfo.lng
        );

        if (isFavorited(resolvedShopId)) {
          removeFromFavorites(resolvedShopId);
          favorites = favorites.filter(fav => fav.shop_id !== resolvedShopId);
          target.classList.remove('favorited');
          target.querySelector('svg').setAttribute('fill', 'none');
          target.setAttribute('aria-label', `Add ${shopInfo.name} to favorites`);
          console.log(`Removed ${shopInfo.name} from favorites`);
        } else {
          const shopData = { shop_id: resolvedShopId, name: shopInfo.name };
          await addToFavorites(shopData);
          favorites.push(shopData);
          target.classList.add('favorited');
          target.querySelector('svg').setAttribute('fill', 'currentColor');
          target.setAttribute('aria-label', `Remove ${shopInfo.name} from favorites`);
          console.log(`Added ${shopInfo.name} to favorites`);
        }

        updateFavoritesModal();
      } catch (err) {
        console.error('Error handling favorite toggle:', err);
      }
    })(); // <--- Make sure you close the async IIFE here!
  }
}


const top100Modal = document.getElementById('top100');
const openTop100Btn = document.getElementById('top-100-button');
const closeTop100Btn = document.querySelector('.top100-modal-close-button');

openTop100Btn?.addEventListener('click', () => {
  if (!top100Modal.open) {
    top100Modal.showModal();
  }
  displayTop100Shops();
});

closeTop100Btn?.addEventListener('click', () => {
  top100Modal.close();
});