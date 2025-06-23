const supabase = window.supabase.createClient(
  'https://mqfknhzpjzfhuxusnasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs'
);

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
    <div id="rating-container" class="review-banner-rating-container">
      ${Array.from({ length: 10 }, (_, i) => `
        <button type="button" class="review-banner-rating-button">${i + 1}</button>
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
    <div class="review-banner-actions">
      <button id="review-cancel-button" class="review-banner-cancel-button">Cancel</button>
      <button id="submit-review-button" class="review-banner-submit-button">Submit</button>
    </div>
  `;
  reviewBanner.classList.remove('hidden');

  reviewBanner.addEventListener('click', (e) => e.stopPropagation());

  const ratingButtons = reviewBanner.querySelectorAll('#rating-container button');
  let selectedRating = null;
  ratingButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      ratingButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      selectedRating = parseInt(button.textContent);
      console.log('Rating selected:', selectedRating);
    });
  });

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
      created_at: new Date().toISOString()
    };

    console.log('Submitting review:', review);
    const { data, error } = await supabase
      .from('reviews')
      .insert([review]);

    if (error) {
      console.error('Error saving review:', error.message);
      alert(`Failed to submit review: ${error.message}`);
      return;
    }

    console.log('Review submitted:', data);
    reviewBanner.classList.add('hidden');
    showShopDetails(shop);
  });
}