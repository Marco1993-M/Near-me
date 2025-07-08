import { getMapInstance, showRouteTo, clearRoute, getUserLocation } from './map.js';
import { addToFavorites, removeFromFavorites, isShopFavorited } from './favorites.js';
import { getOrCreateShop, calculateAverageRating } from './db.js';
import { showMapsPrompt } from './utils.js';
import { showShopDetails } from './shopdetails.js';
import supabase from './supabase.js';
import L from 'leaflet';

export async function loadShops() {
  const { data: shops, error } = await supabase.from('shops').select('*');
  if (error) {
    console.error('Error loading shops:', error.message);
    return;
  }

  const mapInstance = getMapInstance();
  if (!mapInstance) {
    console.error('Map instance is not available.');
    return;
  }
  const map = mapInstance.map;
  const customIcon = mapInstance.customIcon;

  shops.forEach((shop) => {
    if (!shop.lat || !shop.lng) return;
    const marker = L.marker([shop.lat, shop.lng], { icon: customIcon }).addTo(map);
    marker.on('click', () => {
      console.log('Marker clicked:', shop);
      showFloatingCard(shop);
    });
  });
}

export async function showFloatingCard(shop) {
  console.log('showFloatingCard called with:', shop); // Debug log
  if (!shop || !shop.name || !shop.address || !shop.city) {
    console.warn('Invalid shop data:', shop);
    return;
  }

  try {
    shop.id = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
  } catch (err) {
    console.error('Error getting shop ID:', err);
    return;
  }

  let ratingText = 'No ratings yet';
  try {
    const avg = await calculateAverageRating(shop.name, shop.id);
    if (avg > 0) ratingText = `${avg} / 10`;
  } catch (err) {
    console.error('Rating calculation error:', err);
  }

  const favorited = await isShopFavorited(shop.id);
  const card = document.getElementById('floating-card');
  if (!card) {
    console.error('Floating card element not found');
    return;
  }

  // Populate card content
  card.innerHTML = `
    <button class="floating-card-close-button" aria-label="Close ${shop.name} details">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h3 class="floating-card-heading">${shop.name}</h3>
    <p class="floating-card-info">${shop.address?.split('\n')[0].split(',')[0].trim() || 'Unknown location'} ⭐ ${ratingText}</p>
    <div class="floating-card-actions">
      ${shop.phone ? `
        <button id="call-button" class="floating-card-action-button" aria-label="Call">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
        </button>
      ` : ''}
      <button id="directions-button" class="floating-card-action-button" aria-label="Get Directions">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      </button>
      <button id="share-button" class="floating-card-action-button" aria-label="Share">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 2L11 13" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
      <button id="favorite-button" class="floating-card-action-button" aria-label="${favorited ? 'Remove from favorites' : 'Add to favorites'}">
        ${favorited ? `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
            4.42 3 7.5 3c1.74 0 3.41 0.81 
            4.5 2.09C13.09 3.81 14.76 3 
            16.5 3 19.58 3 22 5.42 
            22 8.5c0 3.78-3.4 6.86-8.55 
            11.54L12 21.35z" />
          </svg>
        ` : `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 
            7.636l1.318-1.318a4.5 4.5 0 116.364 
            6.364L12 21.364l-7.682-7.682a4.5 
            4.5 0 010-6.364z" />
          </svg>
        `}
      </button>
    </div>
  `;

  card.dataset.shopId = shop.id;

  // Clone card to clear previous event listeners
  const newCard = card.cloneNode(true);
  card.parentNode.replaceChild(newCard, card);

  // Ensure card is visible
  newCard.classList.remove('hidden');

  // Attach event listeners to the new card
  newCard.addEventListener('click', function cardClickListener(event) {
    if (!event.target.closest('button')) {
      showShopDetails(shop);
    }
  });

  newCard.querySelector('.floating-card-close-button')?.addEventListener('click', () => {
    console.log('Close button clicked');
    clearRoute();
    newCard.classList.add('hidden');
  });

  newCard.querySelector('#call-button')?.addEventListener('click', () => {
    if (shop.phone) window.open(`tel:${shop.phone}`);
  });

  newCard.querySelector('#directions-button')?.addEventListener('click', () => {
    if (!shop.lat || !shop.lng) return alert('No location available');
    showMapsPrompt(shop, (useGoogle) => {
      const coords = `${shop.lat},${shop.lng}`;
      window.location.href = useGoogle
        ? `https://www.google.com/maps/dir/?api=1&destination=${coords}`
        : `maps://?daddr=${coords}&dirflg=d`;
    });
  });

  newCard.querySelector('#share-button')?.addEventListener('click', async () => {
    const shareData = {
      title: shop.name,
      text: `Visit ${shop.name} at ${shop.address}`,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address + ', ' + shop.city)}`
    };
    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      alert('Link copied to clipboard');
    }
  });

  newCard.querySelector('#favorite-button')?.addEventListener('click', async () => {
    if (await isShopFavorited(shop.id)) {
      await removeFromFavorites(shop);
    } else {
      await addToFavorites(shop);
    }
    // Avoid recursive call to showFloatingCard to prevent listener buildup
    // Instead, update the favorite button directly
    const favorited = await isShopFavorited(shop.id);
    const favoriteButton = newCard.querySelector('#favorite-button');
    if (favoriteButton) {
      favoriteButton.innerHTML = favorited
        ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
             4.42 3 7.5 3c1.74 0 3.41 0.81 
             4.5 2.09C13.09 3.81 14.76 3 
             16.5 3 19.58 3 22 5.42 
             22 8.5c0 3.78-3.4 6.86-8.55 
             11.54L12 21.35z" />
           </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 
             7.636l1.318-1.318a4.5 4.5 0 116.364 
             6.364L12 21.364l-7.682-7.682a4.5 
             4.5 0 010-6.364z" />
           </svg>`;
      favoriteButton.setAttribute('aria-label', favorited ? 'Remove from favorites' : 'Add to favorites');
    }
  });

  // Show route
  requestAnimationFrame(() => {
    const userLatLng = getUserLocation();
    const shopLatLng = [shop.lat, shop.lng];
    if (userLatLng && shopLatLng) {
      showRouteTo(shopLatLng, userLatLng);
    }
  });
}
