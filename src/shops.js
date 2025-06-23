import { getMapInstance, showRouteTo, clearRoute, getUserLocation } from './map.js';
import { addToFavorites, removeFromFavorites, isShopFavorited } from './favorites.js';
import { getOrCreateShop, calculateAverageRating } from './db.js';
import { showMapsPrompt } from './utils.js';
import { showShopDetails } from './shopdetails.js';

const supabase = window.supabase.createClient(
  'https://mqfknhzpjzfhuxusnasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs'
);

import L from 'leaflet';

export async function loadShops() {
  const { data: shops, error } = await supabase.from('shops').select('*');

  if (error) {
    console.error('Error loading shops:', error.message);
    return;
  }

  const map = getMapInstance();
  shops.forEach((shop) => {
    if (!shop.lat || !shop.lng) return;

    const marker = L.marker([shop.lat, shop.lng], { icon: map.customIcon }).addTo(map);
    marker.on('click', () => showFloatingCard(shop));
  });
}

export async function showFloatingCard(shop) {
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
  if (!card) return;

  const address = shop.address?.split('\n')[0].split(',')[0].trim() || 'Unknown location';

card.innerHTML = `
  <button class="floating-card-close-button" aria-label="Close ${shop.name} details">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
  <h3 class="floating-card-heading">${shop.name}</h3>
  <p class="floating-card-info">${address} ⭐ ${ratingText}</p>
  <div class="floating-card-actions">
    ${shop.phone ? `
      <button id="call-button" class="floating-card-action-button" aria-label="Call">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h2l3.6 7.59a1 1 0 01-.17 1.09l-2.6 3.41a16 16 0 007.41 7.41l3.41-2.6a1 1 0 011.09-.17L19 19v2a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1z" />
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
  card.classList.remove('hidden');

  card.addEventListener('click', function cardClickListener(event) {
    if (!event.target.closest('button')) {
      showShopDetails(shop);
    }
  });

  // Call showRouteTo after the card has been displayed
  requestAnimationFrame(() => {
    const userLatLng = getUserLocation();
    const shopLatLng = [shop.lat, shop.lng];
    if (userLatLng && shopLatLng) {
      showRouteTo(shopLatLng, userLatLng);
    }
  });

  // Close button clears route and hides card
  card.querySelector('.floating-card-close-button')?.addEventListener('click', () => {
    clearRoute();
    card.classList.add('hidden');
  });

  document.getElementById('call-button')?.addEventListener('click', () => {
    if (shop.phone) window.open(`tel:${shop.phone}`);
  });

  document.getElementById('directions-button')?.addEventListener('click', () => {
    if (!shop.lat || !shop.lng) return alert('No location available');
    showMapsPrompt(shop, (useGoogle) => {
      const coords = `${shop.lat},${shop.lng}`;
      window.location.href = useGoogle
        ? `https://www.google.com/maps/dir/?api=1&destination=${coords}`
        : `maps://?daddr=${coords}&dirflg=d`;
    });
  });

  document.getElementById('share-button')?.addEventListener('click', async () => {
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

  document.getElementById('favorite-button')?.addEventListener('click', async () => {
    if (await isShopFavorited(shop.id)) {
      await removeFromFavorites(shop);
    } else {
      await addToFavorites(shop);
    }
    showFloatingCard(shop); // refresh UI
  });
}