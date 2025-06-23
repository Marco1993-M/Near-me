const supabase = window.supabase.createClient(
  'https://mqfknhzpjzfhuxusnasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs'
);

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

  // Get or create shop to ensure we have a shop_id
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

  let averageRating = 0;
  let reviews = [];
  try {
    // Fetch reviews from Supabase
    const { data: shopReviews, error } = await supabase
      .from('reviews')
      .select('rating, text, parking, pet_friendly, outside_seating')
      .eq('shop_id', shopId);
    if (error) throw error;
    reviews = shopReviews || [];
    averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
      : 0;
  } catch (error) {
    console.error('Error fetching reviews:', error);
  }
  const displayRating = averageRating > 0 ? `${averageRating.toFixed(1)} / 10` : 'No ratings yet';

  const dotsHTML = Array.from({ length: 10 }, (_, i) => `
    <span class="shop-details-rating-dot" style="background-color: ${i < Math.floor(averageRating) ? '#4b5563' : '#d1d5db'};"></span>
  `).join('');

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

  let reviewsHTML = reviews.length === 0
    ? '<p>No reviews yet.</p>'
    : `
      <div class="shop-details-reviews-container">
        <div class="shop-details-reviews-track">
          ${reviews.map(review => `
            <div class="shop-details-review-card">
              <p><strong>Rating:</strong> ${review.rating}/10</p>
              <p>${review.text}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

  const amenities = new Set();
  reviews.forEach(review => {
    if (review.parking) amenities.add('Parking Available');
    if (review.pet_friendly) amenities.add('Pet Friendly');
    if (review.outside_seating) amenities.add('Outside Seating');
  });
  const amenitiesHTML = amenities.size > 0
    ? `<div class="shop-details-amenities">${Array.from(amenities).map(amenity => `<span class="shop-details-amenity">${amenity}</span>`).join(' ')}</div>`
    : '';

  const coffeeIcon = `
    <svg class="text-brown-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
  `;

  shopDetailsBanner.innerHTML = `
    <button class="shop-details-close-button" aria-label="Close ${shop.name} details">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h3 class="shop-details-heading">${shop.name}</h3>
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
  console.log('Shop details banner displayed for:', shop.name);

  // Add close button event listener
  const closeButton = shopDetailsBanner.querySelector('.shop-details-close-button');
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      shopDetailsBanner.classList.add('hidden');
      console.log('Shop details banner closed');
    });
  }

let currentShop = null;
  // Add event listener for "Leave a Review" button
  const leaveReviewButton = shopDetailsBanner.querySelector('.shop-details-leave-review-button');
  if (leaveReviewButton) {
    leaveReviewButton.addEventListener('click', (e) => {
      e.stopPropagation();
      currentShop = { ...shop, id: shopId };
      showReviewBanner(currentShop);
      shopDetailsBanner.classList.add('hidden');
    });
  }

  // Add action button listeners
  const callButton = shopDetailsBanner.querySelector('#call-button');
  if (callButton) {
    callButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shop.phone) window.location.href = `tel:${shop.phone}`;
    });
  }

  const directionsButton = shopDetailsBanner.querySelector('#directions-button');
  if (directionsButton) {
    directionsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shop.address) window.location.href = `geo:0,0?q=${encodeURIComponent(shop.address)}`;
    });
  }

  const websiteButton = shopDetailsBanner.querySelector('#website-button');
  if (websiteButton) {
    websiteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shop.website) window.open(shop.website, '_blank');
    });
  }

  // Make reviews track scrollable
  const reviewsTrack = shopDetailsBanner.querySelector('.shop-details-reviews-track');
  if (reviewsTrack) {
    let isDragging = false;
    let startX, scrollLeft;

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
      const walk = (x - startX) * 1.5;
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
