import supabase from './supabase.js';


export async function showReviewBanner(shop) {
  console.log('showReviewBanner for:', shop.name, 'Shop object:', shop);
  if (!shop || !shop.name || !shop.address || !shop.city) {
    console.warn('Invalid shop data:', shop);
    document.getElementById('review-banner')?.classList.add('hidden');
    return;
  }

  if (!supabase || !supabase.auth) {
    console.error('Supabase client is not initialized');
    alert('Error: Database connection not available.');
    return;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('User not authenticated:', userError?.message);
    showAuthBanner(shop, () => showReviewBanner(shop));
    return;
  }

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
    <div id="rating-container" class="rating-carousel">
      ${Array.from({ length: 10 }, (_, i) => `
        <button type="button" class="rating-pill">${i + 1}</button>
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

    <button id="toggle-specialty-details" class="review-banner-toggle-details">
      + Add Specialty Coffee Info
    </button>
    <div id="specialty-details-section" class="hidden">
      <label>
        Brew Method:
        <select id="brew-method">
          <option value="">Select</option>
          <option>Espresso</option>
          <option>Pour Over</option>
          <option>French Press</option>
          <option>Aeropress</option>
          <option>Cold Brew</option>
        </select>
      </label>
      <label>
        Roast Level:
        <select id="roast-level">
          <option value="">Select</option>
          <option>Light</option>
          <option>Medium</option>
          <option>Dark</option>
        </select>
      </label>
      <label>
        Origin:
        <select id="origin">
          <option value="">Select</option>
          <option>Ethiopia</option>
          <option>Colombia</option>
          <option>Kenya</option>
          <option>Brazil</option>
          <option>Guatemala</option>
          <option>Rwanda</option>
          <option>Costa Rica</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        Tasting Notes:
        <select id="tasting-notes">
          <option value="">Select</option>
          <option>Fruity</option>
          <option>Chocolate</option>
          <option>Nutty</option>
          <option>Floral</option>
          <option>Citrus</option>
          <option>Spicy</option>
          <option>Earthy</option>
          <option>Other</option>
        </select>
      </label>
    </div>

    <div class="review-banner-actions">
      <button id="review-cancel-button" class="review-banner-cancel-button">Cancel</button>
      <button id="submit-review-button" class="review-banner-submit-button">Submit</button>
    </div>
  `;

  reviewBanner.classList.remove('hidden');
  reviewBanner.addEventListener('click', (e) => e.stopPropagation());

  const ratingContainer = reviewBanner.querySelector('#rating-container');
  const ratingButtons = reviewBanner.querySelectorAll('.rating-pill');
  let selectedRating = null;

  ratingButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      ratingButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      selectedRating = parseInt(button.textContent);
      console.log('Rating selected:', selectedRating);
    });
  });

  // Center the "5" rating pill on load
  const buttonsArray = Array.from(ratingButtons);
  const middleButton = buttonsArray.find(btn => btn.textContent === '5');

  if (middleButton) {
    const containerWidth = ratingContainer.offsetWidth;
    const buttonCenter = middleButton.offsetLeft + middleButton.offsetWidth / 2;
    const scrollLeft = buttonCenter - containerWidth / 2;

    ratingContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });

    middleButton.classList.add('active');
    selectedRating = 5;
  }

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

  const toggleBtn = reviewBanner.querySelector('#toggle-specialty-details');
  const specialtySection = reviewBanner.querySelector('#specialty-details-section');
  toggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    specialtySection.classList.toggle('hidden');
    toggleBtn.textContent = specialtySection.classList.contains('hidden')
      ? '+ Add Specialty Coffee Info'
      : '− Hide Specialty Coffee Info';
  });

  reviewBanner.querySelector('#submit-review-button')?.addEventListener('click', async (e) => {
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

    let shopId = shop.id;
    if (!shopId) {
      try {
        shopId = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
        shop.id = shopId;
        console.log('Shop ID retrieved or created:', shopId);
      } catch (error) {
        console.error('Error getting or creating shop:', error.message);
        alert('Failed to submit review: Could not retrieve shop ID.');
        return;
      }
    }

    const review = {
      user_id: user.id,
      shop_id: shopId,
      rating: selectedRating,
      text: reviewText,
      parking,
      pet_friendly: petFriendly,
      outside_seating: outsideSeating,
      brew_method: reviewBanner.querySelector('#brew-method')?.value || null,
      roast_level: reviewBanner.querySelector('#roast-level')?.value || null,
      origin: reviewBanner.querySelector('#origin')?.value || null,
      tasting_notes: reviewBanner.querySelector('#tasting-notes')?.value || null,
      created_at: new Date().toISOString()
    };

    console.log('Submitting review:', review);
    const { data, error } = await supabase.from('reviews').insert([review]);

    if (error) {
      alert(`Failed to submit review: ${error.message}`);
      return;
    }

    reviewBanner.classList.add('hidden');
    showShopDetails?.(shop);
  });
}
