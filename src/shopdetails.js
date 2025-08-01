import supabase from './supabase.js';
import { clearRoute } from './map.js';
import { getOrCreateShop } from './db.js';
import { showReviewBanner } from './reviewbanner.js';

export async function showShopDetails(shop) {
  const floatingCard = document.getElementById('floating-card');
  if (floatingCard) {
    floatingCard.classList.add('hidden');
    clearRoute();
  }

  if (!shop || !shop.name || !shop.address || !shop.city) {
    console.warn('Invalid shop data:', shop);
    document.getElementById('shop-details-banner')?.classList.add('hidden');
    return;
  }

  console.log('Showing shop details for:', shop.name);

  // Ensure shop exists and has ID
  let shopId;
  try {
    shopId = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
    shop.id = shopId;
  } catch (error) {
    console.error('Error getting shop ID:', error);
    shop.id = null;
  }

  const shopDetailsBanner = document.getElementById('shop-details-banner');
  if (!shopDetailsBanner) {
    console.error('Shop details banner element not found');
    return;
  }

  // --- Fetch Reviews ---
  let averageRating = 0;
  let reviews = [];
  try {
    const { data: shopReviews, error } = await supabase
      .from('reviews')
      .select('rating, text, parking, pet_friendly, outside_seating')
      .eq('shop_id', shopId);

    if (error) throw error;

    reviews = shopReviews || [];
    averageRating = reviews.length
      ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
      : 0;
  } catch (error) {
    console.error('Error fetching reviews:', error);
  }

  const displayRating = averageRating > 0 ? `${averageRating.toFixed(1)} / 10` : 'No ratings yet';
  const dotsHTML = Array.from({ length: 10 }, (_, i) => `
    <span class="shop-details-rating-dot" style="background-color: ${i < Math.floor(averageRating) ? '#4b5563' : '#d1d5db'};"></span>
  `).join('');

  const totalReviews = reviews.length;
  const breakdown = { Excellent: 0, 'Very Good': 0, Average: 0, Poor: 0, Terrible: 0 };
  reviews.forEach(({ rating }) => {
    const val = Number(rating);
    if (val >= 8) breakdown.Excellent++;
    else if (val >= 6) breakdown['Very Good']++;
    else if (val >= 4) breakdown.Average++;
    else if (val >= 2) breakdown.Poor++;
    else breakdown.Terrible++;
  });

  const breakdownHTML = Object.entries(breakdown).map(([label, count]) => `
    <div class="shop-details-breakdown-row">
      <span class="shop-details-breakdown-label">${label}</span>
      <div class="shop-details-progress-bar">
        <div class="shop-details-progress-bar-fill" style="width: ${totalReviews > 0 ? (count / totalReviews) * 100 : 0}%;"></div>
      </div>
      <span class="shop-details-breakdown-count">${count}</span>
    </div>
  `).join('');

  const reviewsHTML = reviews.length === 0
    ? '<p>No reviews yet.</p>'
    : `
      <div class="shop-details-reviews-container">
        <div class="shop-details-reviews-track">
          ${reviews.map(r => `
            <div class="shop-details-review-card">
              <p><strong>Rating:</strong> ${r.rating}/10</p>
              <p>${r.text}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

  const amenities = new Set();
  reviews.forEach(r => {
    if (r.parking) amenities.add('Parking Available');
    if (r.pet_friendly) amenities.add('Pet Friendly');
    if (r.outside_seating) amenities.add('Outside Seating');
  });
  const amenitiesHTML = amenities.size
    ? `<div class="shop-details-amenities">${[...amenities].map(a => `<span class="shop-details-amenity">${a}</span>`).join(' ')}</div>`
    : '';

  // --- Update canonical URL ---
  const canonicalLink = document.querySelector("link[rel='canonical']") || (() => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
    return link;
  })();

  const baseUrl = window.location.origin;
  // Fallback slug or name-based slug
  const slug = shop.slug || shop.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  const shopUrl = `${baseUrl}/${slug}`;
  canonicalLink.setAttribute('href', shopUrl);

  // --- Optionally update document title and meta description ---
  document.title = `${shop.name} — Near Me Cafe`;

  const descriptionMeta = document.querySelector('meta[name="description"]') || (() => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
    return meta;
  })();

  descriptionMeta.setAttribute('content', `Find reviews and details for ${shop.name} located at ${shop.address}, ${shop.city}.`);

  // --- Render HTML ---
  shopDetailsBanner.innerHTML = `
  <button class="shop-details-close-button" aria-label="Close ${shop.name} details">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
  <h3 class="shop-details-heading">${shop.name}</h3>
  <div class="shop-details-actions" style="display: flex; gap: 10px;">
    ${shop.phone ? `
      <button id="call-button" class="floating-card-action-button" aria-label="Call">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone-icon lucide-phone"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>
        <span>Call</span>
      </button>` : ''
    }
    ${shop.address ? `
      <button id="directions-button" class="floating-card-action-button" aria-label="Directions">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin-icon lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
        <span>Directions</span>
      </button>` : ''
    }
    ${shop.website ? `
      <button id="website-button" class="floating-card-action-button" aria-label="Website">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link2-icon lucide-link-2"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
        <span>Website</span>
      </button>` : ''
    }
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
    <button class="shop-details-leave-review-button" aria-label="Leave a review for ${shop.name}">Leave a Review</button>
  </div>
`;

  shopDetailsBanner.classList.remove('hidden');
  console.log('Shop details banner displayed for:', shop.name);

  // --- Slide-down close handler ---
  function closeWithAnimation(callback) {
    shopDetailsBanner.style.animation = 'slideDown 0.3s ease-in forwards';
    shopDetailsBanner.addEventListener('animationend', () => {
      shopDetailsBanner.classList.add('hidden');
      shopDetailsBanner.style.animation = '';
      if (callback) callback();
    }, { once: true });
  }

  // Close button: slide down then hide
  shopDetailsBanner.querySelector('.shop-details-close-button')?.addEventListener('click', () => {
    closeWithAnimation(() => {
      console.log('Shop details banner closed with animation');
    });
  });

  // Leave review button: slide down, hide, then open review banner
  shopDetailsBanner.querySelector('.shop-details-leave-review-button')?.addEventListener('click', () => {
    closeWithAnimation(() => {
      showReviewBanner({ ...shop, id: shopId });
    });
  });

  // Other button event listeners
  shopDetailsBanner.querySelector('#call-button')?.addEventListener('click', () => {
    if (shop.phone) window.location.href = `tel:${shop.phone}`;
  });

  shopDetailsBanner.querySelector('#directions-button')?.addEventListener('click', () => {
    if (shop.address) window.location.href = `geo:0,0?q=${encodeURIComponent(shop.address)}`;
  });

  shopDetailsBanner.querySelector('#website-button')?.addEventListener('click', () => {
    if (shop.website) window.open(shop.website, '_blank');
  });

  // Scrollable reviews track setup
  const track = shopDetailsBanner.querySelector('.shop-details-reviews-track');
  if (track) {
    let isDown = false, startX, scrollLeft;
    track.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
      track.style.cursor = 'grabbing';
    });
    track.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollLeft - walk;
    });
    ['mouseup', 'mouseleave'].forEach(type =>
      track.addEventListener(type, () => {
        isDown = false;
        track.style.cursor = 'grab';
      })
    );
  }
}
