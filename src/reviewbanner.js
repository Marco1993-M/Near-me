import supabase from './supabase.js';
import { showToast } from './ui.js';
import { getOrCreateShop } from './db.js';

/* ------------------------------ HELPERS ------------------------------ */

function closeReviewBanner(reviewBanner, afterClose) {
  reviewBanner.style.animation = 'slideDown 0.3s ease-in forwards';
  reviewBanner.addEventListener(
    'animationend',
    () => {
      reviewBanner.classList.add('hidden');
      reviewBanner.style.animation = '';
      document.body.classList.remove('body-no-scroll');
      if (typeof afterClose === 'function') afterClose();
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
    <div class="review-banner-options">
      <button type="button" data-option="parking" class="option-pill">🚗 Parking</button>
      <button type="button" data-option="pet-friendly" class="option-pill">🐶 Pet Friendly</button>
      <button type="button" data-option="outside-seating" class="option-pill">☀️ Outside Seating</button>
    </div>
    <div id="drink-container" class="review-banner-drink-container">
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
      <label>Brew Method:
        <select id="brew-method"><option value="">Select</option><option>Espresso</option><option>Pour Over</option><option>French Press</option><option>Aeropress</option><option>Cold Brew</option></select>
      </label>
      <label>Roast Level:
        <select id="roast-level"><option value="">Select</option><option>Light</option><option>Medium</option><option>Dark</option></select>
      </label>
      <label>Origin:
        <select id="origin"><option value="">Select</option><option>Ethiopia</option><option>Colombia</option><option>Kenya</option><option>Brazil</option><option>Guatemala</option><option>Rwanda</option><option>Costa Rica</option><option>Other</option></select>
      </label>
      <label>Tasting Notes:
        <select id="tasting-notes"><option value="">Select</option><option>Fruity</option><option>Chocolate</option><option>Nutty</option><option>Floral</option><option>Citrus</option><option>Spicy</option><option>Earthy</option><option>Other</option></select>
      </label>
      <label>Process:
        <select id="process"><option value="">Select</option><option>Washed</option><option>Natural</option><option>Honey</option><option>Pulped Natural</option><option>Other</option></select>
      </label>
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

  // --- Get current user if logged in, otherwise anonymous ---
  let currentUserId = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) currentUserId = user.id;
  } catch {
    console.log("Anonymous review: user not logged in.");
  }

  // Inject dynamic HTML
  reviewBanner.innerHTML = buildReviewBannerHTML(shop);
  reviewBanner.classList.remove('hidden');
  reviewBanner.style.animation = 'slideUp 0.4s ease-out forwards';
  document.body.classList.add('body-no-scroll');
  reviewBanner.addEventListener('click', e => e.stopPropagation());

  // --- Option pills ---
  const optionPills = reviewBanner.querySelectorAll('.option-pill');
  const optionsState = { parking: false, 'pet-friendly': false, 'outside-seating': false };
  optionPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const key = pill.dataset.option;
      optionsState[key] = !optionsState[key];
      pill.classList.toggle('active', optionsState[key]);
    });
  });

  // --- Rating pills ---
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

  // --- Drink pills ---
  let selectedDrink = null;
  const drinkButtons = reviewBanner.querySelectorAll('.drink-pill');
  drinkButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      drinkButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDrink = btn.dataset.value;
    });
  });

  // --- Cancel / Close ---
  reviewBanner.querySelector('#review-drag-handle')?.addEventListener('click', () => closeReviewBanner(reviewBanner));
  reviewBanner.querySelector('#review-cancel-button')?.addEventListener('click', () => closeReviewBanner(reviewBanner));

  // --- Specialty toggle ---
  const toggleBtn = reviewBanner.querySelector('#toggle-specialty-details');
  const specialtySection = reviewBanner.querySelector('#specialty-details-section');
  toggleBtn?.addEventListener('click', () => {
    const isOpen = !specialtySection.classList.contains('hidden');
    toggleBtn.disabled = true;
    if (isOpen) {
      specialtySection.style.maxHeight = specialtySection.scrollHeight + 'px';
      requestAnimationFrame(() => {
        specialtySection.style.transition = 'max-height 0.35s ease, opacity 0.35s ease';
        specialtySection.style.maxHeight = '0';
        specialtySection.style.opacity = '0';
      });
      toggleBtn.textContent = '+ Add Specialty Coffee Info';
    } else {
      specialtySection.classList.remove('hidden');
      specialtySection.style.opacity = '0';
      specialtySection.style.maxHeight = '0';
      requestAnimationFrame(() => {
        specialtySection.style.transition = 'max-height 0.35s ease, opacity 0.35s ease';
        specialtySection.style.maxHeight = specialtySection.scrollHeight + 'px';
        specialtySection.style.opacity = '1';
      });
      toggleBtn.textContent = '− Hide Specialty Coffee Info';
    }
    specialtySection.addEventListener('transitionend', () => {
      specialtySection.style.transition = '';
      specialtySection.style.maxHeight = '';
      if (isOpen) specialtySection.classList.add('hidden');
      toggleBtn.disabled = false;
    }, { once: true });
  });

  // --- Submit review ---
  reviewBanner.querySelector('#submit-review-button')?.addEventListener('click', async function handleSubmit() {
    const submitBtn = this;
    submitBtn.disabled = true;

    const reviewText = reviewBanner.querySelector('#review-text').value.trim();
    const parking = optionsState.parking;
    const petFriendly = optionsState['pet-friendly'];
    const outsideSeating = optionsState['outside-seating'];
    const drink = selectedDrink;

    if (!selectedRating) { showToast({ message: "Please select a rating.", category: "error" }); submitBtn.disabled = false; return; }
    if (!reviewText) { showToast({ message: "Please write a review.", category: "error" }); submitBtn.disabled = false; return; }
    if (!drink) { showToast({ message: "Please select a drink.", category: "error" }); submitBtn.disabled = false; return; }

    try {
      let shopId = shop.id;
      if (!shopId) {
        shopId = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
        shop.id = shopId;
      }

const review = {
  user_id: currentUserId || '00000000-0000-0000-0000-000000000000', // placeholder for anonymous
  shop_id: shopId,
  rating: selectedRating,
  text: reviewText,
  parking,
  pet_friendly: petFriendly,
  outside_seating: outsideSeating,
  drink,
  brew_method: reviewBanner.querySelector('#brew-method')?.value || null,
  roast_level: reviewBanner.querySelector('#roast-level')?.value || null,
  process: reviewBanner.querySelector('#process')?.value || null,
  origin: reviewBanner.querySelector('#origin')?.value || null,
  tasting_notes: reviewBanner.querySelector('#tasting-notes')?.value || null,
  created_at: new Date().toISOString(),
};


      const { error } = await supabase.from('reviews').insert([review]);
      if (error) {
        showToast({ message: `Failed to submit review: ${error.message}`, category: "error", duration: 4000 });
        submitBtn.disabled = false;
        return;
      }

      showToast({ category: "reviews", type: "success", duration: 3000 });
      closeReviewBanner(reviewBanner, () => {
        if (typeof onSuccess === 'function') onSuccess(shop);
        else defaultAfterReview(shop);
      });

    } catch (err) {
      showToast({ message: `Failed to submit review: ${err.message}`, category: "error", duration: 4000 });
      submitBtn.disabled = false;
    }
  });
}
