import supabase from './supabase.js';

export async function showReviewBanner(shop) {
  if (!shop || !shop.name || !shop.address || !shop.city) {
    console.warn('Invalid shop data:', shop);
    document.getElementById('review-banner')?.classList.add('hidden');
    return;
  }

  if (!supabase || !supabase.auth) {
    alert('Error: Database connection not available.');
    return;
  }

  // Check if user is logged in
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // Show auth banner and wait for login
    if (window.showAuthBannerIfNotLoggedIn) {
      const loggedIn = await window.showAuthBannerIfNotLoggedIn();
      if (!loggedIn) {
        // User cancelled or failed login; do not proceed
        return;
      }
      // After login, re-fetch user info
      const { data: newData } = await supabase.auth.getUser();
      if (!newData?.user) return;
    } else {
      alert('You must be logged in to leave a review.');
      return;
    }
  }

  const reviewBanner = document.getElementById('review-banner');
  if (!reviewBanner) return;

  document.body.classList.add('body-no-scroll'); // Prevent background scroll

  reviewBanner.innerHTML = `
    <div id="review-drag-handle" class="review-banner-drag-handle" aria-label="Drag to close"></div>

    <h3 id="shop-name" class="review-banner-heading">Leave a Review for ${shop.name}</h3>
    <p class="review-banner-instruction">Select a rating</p>

    <div id="rating-container" class="rating-carousel">
      ${Array.from({ length: 10 }, (_, i) => `
        <button type="button" class="rating-pill">${i + 1}</button>
      `).join('')}
    </div>
    <p class="rating-scroll-hint">scroll to choose a rating</p>

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
  reviewBanner.style.animation = 'slideUp 0.4s ease-out forwards';
  reviewBanner.addEventListener('click', (e) => e.stopPropagation());

  // Rating logic
  const ratingContainer = reviewBanner.querySelector('#rating-container');
  const ratingButtons = reviewBanner.querySelectorAll('.rating-pill');
  let selectedRating = 5;

  ratingButtons.forEach(button => {
    button.addEventListener('click', () => {
      ratingButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      selectedRating = parseInt(button.textContent);
    });
  });

  const middleButton = Array.from(ratingButtons).find(btn => btn.textContent === '5');
  if (middleButton) {
    const scrollLeft = middleButton.offsetLeft + middleButton.offsetWidth / 2 - ratingContainer.offsetWidth / 2;
    ratingContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    middleButton.classList.add('active');
  }

  // Close modal via drag handle
  document.getElementById('review-drag-handle')?.addEventListener('click', () => {
    reviewBanner.style.animation = 'slideDown 0.3s ease-in forwards';
    reviewBanner.addEventListener('animationend', () => {
      reviewBanner.classList.add('hidden');
      reviewBanner.style.animation = '';
      document.body.classList.remove('body-no-scroll'); // Re-enable scroll
    }, { once: true });
  });

  // Cancel button
  reviewBanner.querySelector('#review-cancel-button')?.addEventListener('click', () => {
    reviewBanner.classList.add('hidden');
    document.body.classList.remove('body-no-scroll');
  });

  // Toggle specialty coffee info
  const toggleBtn = reviewBanner.querySelector('#toggle-specialty-details');
  const specialtySection = reviewBanner.querySelector('#specialty-details-section');
  toggleBtn?.addEventListener('click', () => {
    specialtySection.classList.toggle('hidden');
    toggleBtn.textContent = specialtySection.classList.contains('hidden')
      ? '+ Add Specialty Coffee Info'
      : '− Hide Specialty Coffee Info';
  });

  // Submit
  reviewBanner.querySelector('#submit-review-button')?.addEventListener('click', async () => {
    const reviewText = reviewBanner.querySelector('#review-text').value.trim();
    const parking = reviewBanner.querySelector('#review-parking').checked;
    const petFriendly = reviewBanner.querySelector('#review-pet-friendly').checked;
    const outsideSeating = reviewBanner.querySelector('#review-outside-seating').checked;

    if (!selectedRating) return alert('Please select a rating.');
    if (!reviewText) return alert('Please write a review.');

    let shopId = shop.id;
    if (!shopId) {
      try {
        shopId = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
        shop.id = shopId;
      } catch (error) {
        return alert('Failed to submit review: Could not retrieve shop ID.');
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

    const { error } = await supabase.from('reviews').insert([review]);
    if (error) return alert(`Failed to submit review: ${error.message}`);

    reviewBanner.classList.add('hidden');
    document.body.classList.remove('body-no-scroll');
    showShopDetails?.(shop);
  });
}
