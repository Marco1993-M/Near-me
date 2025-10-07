import supabase from './supabase.js';
import { showToast } from './ui.js';

/* ------------------------------ HELPERS ------------------------------ */

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('User not logged in');
  return user;
}

function closeReviewBanner(reviewBanner, afterClose) {
  reviewBanner.style.animation = 'slideDown 0.3s ease-in forwards';
  reviewBanner.addEventListener(
    'animationend',
    () => {
      reviewBanner.classList.add('hidden');
      reviewBanner.style.animation = '';
      document.body.classList.remove('body-no-scroll');
      if (typeof afterClose === 'function') {
        try { afterClose(); } catch (err) { console.error('afterClose callback error', err); }
      }
    },
    { once: true }
  );
}

function buildReviewBannerHTML(shop) {
  return `
    <div id="review-drag-handle" class="review-banner-drag-handle" aria-label="Drag to close"></div>
    <h3 id="shop-name" class="review-banner-heading">Leave a Review for ${shop.name}</h3>
    <p class="review-banner-instruction">Select a rating</p>

    <div id="rating-container" class="rating-carousel">
      ${Array.from({ length: 10 }, (_, i) => `<button type="button" class="rating-pill">${i + 1}</button>`).join('')}
    </div>
    <p class="rating-scroll-hint">scroll to choose a rating</p>

    <textarea id="review-text" class="review-banner-textarea" placeholder="Write your review..." required></textarea>

    <div class="review-banner-checkbox-container">
      <label><input id="review-parking" type="checkbox"> Parking</label>
      <label><input id="review-pet-friendly" type="checkbox"> Pet Friendly</label>
      <label><input id="review-outside-seating" type="checkbox"> Outside Seating</label>
    </div>

    <!-- Drink pills -->
    <div id="drink-container" class="review-banner-drink-container">
      <p></p>
      <div class="drink-pills">
        <button type="button" data-value="Latte" class="drink-pill">Latte</button>
        <button type="button" data-value="Cappuccino" class="drink-pill">Cappuccino</button>
        <button type="button" data-value="Flat White" class="drink-pill">Flat White</button>
        <button type="button" data-value="Espresso" class="drink-pill">Espresso</button>
        <button type="button" data-value="Americano" class="drink-pill">Americano</button>
        <button type="button" data-value="Cortado" class="drink-pill">Cortado</button>
        <button type="button" data-value="Seasonal" class="drink-pill">Seasonal</button>
        <button type="button" data-value="Iced" class="drink-pill">Iced</button>
      </div>
    </div>

    <button id="toggle-specialty-details" class="review-banner-toggle-details">+ Add Specialty Coffee Info</button>
    <div id="specialty-details-section" class="review-banner-specialty hidden">
      <label>Brew Method:<select id="brew-method"><option value="">Select</option><option>Espresso</option><option>Pour Over</option><option>French Press</option><option>Aeropress</option><option>Cold Brew</option></select></label>
      <label>Roast Level:<select id="roast-level"><option value="">Select</option><option>Light</option><option>Medium</option><option>Dark</option></select></label>
      <label>Origin:<select id="origin"><option value="">Select</option><option>Ethiopia</option><option>Colombia</option><option>Kenya</option><option>Brazil</option><option>Guatemala</option><option>Rwanda</option><option>Costa Rica</option><option>Other</option></select></label>
      <label>Tasting Notes:<select id="tasting-notes"><option value="">Select</option><option>Fruity</option><option>Chocolate</option><option>Nutty</option><option>Floral</option><option>Citrus</option><option>Spicy</option><option>Earthy</option><option>Other</option></select></label>
    </div>

    <div class="review-banner-actions">
      <button id="review-cancel-button">Cancel</button>
      <button id="submit-review-button">Submit</button>
    </div>
  `;
}

/* -------------------------- DEFAULT CALLBACK -------------------------- */

function defaultAfterReview(shop) {
  if (typeof window.showShopDetails === 'function') {
    window.showShopDetails(shop);
    return;
  }

  const shopCard = document.querySelector(`[data-shop-id="${shop.id}"]`);
  if (shopCard) {
    shopCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    shopCard.classList.add('highlight');
    setTimeout(() => shopCard.classList.remove('highlight'), 2000);
  } else {
    console.log(`Review submitted for ${shop.name}, but no card found.`);
  }
}

/* ---------------------------- MAIN FUNCTION ---------------------------- */

export async function showReviewBanner(shop, { onSuccess } = {}) {
  if (!shop?.name || !shop?.address || !shop?.city) return;

  const reviewBanner = document.getElementById('review-banner');
  if (!reviewBanner) return;

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    if (window.showAuthBannerIfNotLoggedIn) {
      const loggedIn = await window.showAuthBannerIfNotLoggedIn();
      if (!loggedIn) return;
      user = await getCurrentUser();
    } else {
      showToast({ message: "You must be logged in to leave a review.", category: "error" });
      return;
    }
  }

  // Inject dynamic HTML
  reviewBanner.innerHTML = buildReviewBannerHTML(shop);
  reviewBanner.classList.remove('hidden');
  reviewBanner.style.animation = 'slideUp 0.4s ease-out forwards';
  document.body.classList.add('body-no-scroll');
  reviewBanner.addEventListener('click', e => e.stopPropagation());

  // Rating logic
  const ratingContainer = reviewBanner.querySelector('#rating-container');
  const ratingButtons = reviewBanner.querySelectorAll('.rating-pill');
  let selectedRating = 5;

  ratingButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      ratingButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRating = parseInt(btn.textContent, 10);
      const scrollLeft = btn.offsetLeft + btn.offsetWidth / 2 - ratingContainer.offsetWidth / 2;
      ratingContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    });
  });

  const middleButton = Array.from(ratingButtons).find(btn => btn.textContent === '5');
  if (middleButton) middleButton.click();

  // Drink pill selection
  let selectedDrink = null;
  const drinkButtons = reviewBanner.querySelectorAll('.drink-pill');
  drinkButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      drinkButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDrink = btn.dataset.value;
    });
  });

  // Close logic
  reviewBanner.querySelector('#review-drag-handle')?.addEventListener('click', () => closeReviewBanner(reviewBanner));
  reviewBanner.querySelector('#review-cancel-button')?.addEventListener('click', () => closeReviewBanner(reviewBanner));

  // Specialty toggle
  const toggleBtn = reviewBanner.querySelector('#toggle-specialty-details');
  const specialtySection = reviewBanner.querySelector('#specialty-details-section');
  toggleBtn?.addEventListener('click', () => {
    if (specialtySection.classList.contains('hidden')) {
      specialtySection.style.height = '0px';
      specialtySection.classList.remove('hidden');
      const fullHeight = specialtySection.scrollHeight;
      specialtySection.style.transition = 'height 0.3s ease-out';
      requestAnimationFrame(() => (specialtySection.style.height = fullHeight + 'px'));
      specialtySection.addEventListener('transitionend', () => {
        specialtySection.style.height = '';
        specialtySection.style.transition = '';
      }, { once: true });
      toggleBtn.textContent = '− Hide Specialty Coffee Info';
    } else {
      const fullHeight = specialtySection.scrollHeight;
      specialtySection.style.height = fullHeight + 'px';
      requestAnimationFrame(() => (specialtySection.style.height = '0px'));
      specialtySection.addEventListener('transitionend', () => {
        specialtySection.classList.add('hidden');
        specialtySection.style.height = '';
        specialtySection.style.transition = '';
      }, { once: true });
      toggleBtn.textContent = '+ Add Specialty Coffee Info';
    }
  });

  // Submit handler
  reviewBanner.querySelector('#submit-review-button')?.addEventListener('click', async function handleSubmit() {
    const submitBtn = this;
    submitBtn.disabled = true;

    const reviewText = reviewBanner.querySelector('#review-text').value.trim();
    const parking = reviewBanner.querySelector('#review-parking').checked;
    const petFriendly = reviewBanner.querySelector('#review-pet-friendly').checked;
    const outsideSeating = reviewBanner.querySelector('#review-outside-seating').checked;
    const drink = selectedDrink;

    if (!selectedRating) {
      showToast({ message: "Please select a rating.", category: "error" });
      submitBtn.disabled = false;
      return;
    }
    if (!reviewText) {
      showToast({ message: "Please write a review.", category: "error" });
      submitBtn.disabled = false;
      return;
    }
    if (!drink) {
      showToast({ message: "Please select a drink.", category: "error" });
      submitBtn.disabled = false;
      return;
    }

    try {
      let shopId = shop.id;
      if (!shopId) {
        shopId = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
        shop.id = shopId;
      }

      const currentUser = await getCurrentUser();
      const review = {
        user_id: currentUser.id,
        shop_id: shopId,
        rating: selectedRating,
        text: reviewText,
        parking,
        pet_friendly: petFriendly,
        outside_seating: outsideSeating,
        drink,
        brew_method: reviewBanner.querySelector('#brew-method')?.value || null,
        roast_level: reviewBanner.querySelector('#roast-level')?.value || null,
        origin: reviewBanner.querySelector('#origin')?.value || null,
        tasting_notes: reviewBanner.querySelector('#tasting-notes')?.value || null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('reviews').insert([review]);
      if (error) {
        showToast({ message: `Failed to submit review: ${error.message}`, category: "error", type: "error", duration: 4000 });
        submitBtn.disabled = false;
        return;
      }

      showToast({ category: "reviews", type: "success", duration: 3000 });
      closeReviewBanner(reviewBanner, () => {
        if (typeof onSuccess === 'function') onSuccess(shop);
        else defaultAfterReview(shop);
      });

    } catch (err) {
      showToast({ message: `Failed to submit review: ${err.message}`, category: "error", type: "error", duration: 4000 });
      submitBtn.disabled = false;
    }
  });
}
