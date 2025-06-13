const apiKey = 'AIzaSyB6PCrEeC-cr9YRt_DX-iil3MbLX845_ps'; // Replace with your actual Google Maps API key

const client = window.supabase.createClient(
  'https://mqfknhzpjzfhuxusnasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs'
);

async function calculateAverageRating(shopName, shopId = null) {
  try {
    let query = client.from('reviews').select('rating');
    if (shopId) {
      query = query.eq('shop_id', shopId);
    } else {
      const { data: shop, error: shopError } = await client
        .from('shops')
        .select('id')
        .eq('name', shopName)
        .single();
      if (shopError || !shop) {
        console.log(`No shop found with name: ${shopName}`);
        return 0;
      }
      query = query.eq('shop_id', shop.id);
    }

    const { data: reviews, error: reviewError } = await query;
    if (reviewError) {
      console.error('Error fetching reviews:', reviewError);
      return 0;
    }
    if (!reviews || reviews.length === 0) {
      console.log(`No reviews found for shop: ${shopName}`);
      return 0;
    }

    const total = reviews.reduce((sum, review) => sum + Number(review.rating), 0);
    return (total / reviews.length).toFixed(1);
  } catch (error) {
    console.error('Error in calculateAverageRating:', error);
    return 0;
  }
}

// checkAuthOnStartup: Ensures user is logged in on app startup
async function checkAuthOnStartup() {
  console.log('Checking authentication on app startup at', new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }));
  if (!client || !client.auth) {
    console.error('Supabase client is not initialized or auth is unavailable');
    alert('Error: Database connection not available. Please reload the app.');
    return false;
  }

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    console.log('No authenticated user found, showing auth banner');
    showAuthBanner(null, () => {
      console.log('User authenticated, reloading app');
      window.location.reload();
    });
    return false;
  }

  console.log('User authenticated:', user.id);
  return true;
}

// showAuthBanner: Displays login/signup form
async function showAuthBanner(shop, onSuccessCallback = null) {
  const authBanner = document.getElementById('auth-banner');
  if (!authBanner) {
    console.error('Auth banner element not found');
    return;
  }

  if (!client || !client.auth) {
    console.error('Supabase client is not initialized or auth is unavailable');
    alert('Error: Database connection not available. Please try again later.');
    return;
  }

  let isSignUp = false;

  authBanner.innerHTML = `
    <button class="auth-banner-close-button" id="auth-banner-close-button" aria-label="Close auth form">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h3 id="auth-heading" class="auth-banner-heading">${shop ? `Sign In to Leave a Review for ${shop.name}` : 'Sign In to Use the App'}</h3>
    <input id="auth-email" type="email" class="auth-banner-input" placeholder="Email" required>
    <input id="auth-password" type="password" class="auth-banner-input" placeholder="Password" required>
    <div class="auth-banner-actions">
      <button id="auth-toggle-button" class="auth-btn">Need an account? Sign Up</button>
      <button id="submit-auth-button" class="auth-btn">Sign In</button>
      <button id="auth-reset-button" class="auth-btn">Forgot Password?</button>
    </div>
  `;

  authBanner.classList.remove('hidden');
  authBanner.addEventListener('click', (e) => e.stopPropagation());

  const toggleButton = authBanner.querySelector('#auth-toggle-button');
  const authHeading = authBanner.querySelector('#auth-heading');
  const submitButton = authBanner.querySelector('#submit-auth-button');
  const resetButton = authBanner.querySelector('#auth-reset-button');
  const closeButton = authBanner.querySelector('#auth-banner-close-button');
  const emailInput = authBanner.querySelector('#auth-email');
  const passwordInput = authBanner.querySelector('#auth-password');

  // Close banner
  closeButton?.addEventListener('click', () => {
    authBanner.classList.add('hidden');
  });

  // Toggle Login / Sign Up
  toggleButton?.addEventListener('click', (e) => {
    e.stopPropagation();
    isSignUp = !isSignUp;

    authHeading.textContent = isSignUp
      ? (shop ? `Sign Up to Leave a Review for ${shop.name}` : 'Sign Up to Use the App')
      : (shop ? `Sign In to Leave a Review for ${shop.name}` : 'Sign In to Use the App');

    submitButton.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    toggleButton.textContent = isSignUp ? 'Already have an account?' : 'Need an account? Sign Up';
    resetButton.style.display = isSignUp ? 'none' : 'inline-block';
  });

  // Submit Login or Sign Up
  submitButton?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }

    let authError = null;
    try {
      if (isSignUp) {
        const { error } = await client.auth.signUp({ email, password });
        authError = error;
        if (!error) alert('Sign-up successful! Please check your email to confirm your account.');
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        authError = error;
      }

      if (authError) {
        console.error('Authentication error:', authError.message);
        alert(`Authentication failed: ${authError.message}`);
        return;
      }

      authBanner.classList.add('hidden');

      if (onSuccessCallback) {
        onSuccessCallback();
      } else if (shop) {
        showReviewBanner(shop);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Authentication failed.');
    }
  });

  // Password Reset
  resetButton?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const email = emailInput.value.trim();
    if (!email) {
      alert('Please enter your email to reset your password.');
      return;
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href // Or a specific password reset page
      });

      if (error) throw error;
      alert('Password reset link sent! Check your email.');
    } catch (err) {
      console.error('Password reset error:', err.message);
      alert(err.message || 'Failed to send reset email.');
    }
  });

  // Listen for session change
  client.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      authBanner.classList.add('hidden');
    }
  });
}


async function fetchFavorites() {
  console.log('Fetching favorites');
  const { data: authData, error: authError } = await client.auth.getUser();
  const userId = authData?.user?.id;

  if (authError || !userId) {
    console.error('No user authenticated:', authError?.message);
    return [];
  }

  const { data, error } = await client
    .from('favorites')
    .select(`
      id,
      shop_id,
      address,
      created_at,
      shops (
        id,
        name,
        address,
        city,
        lat,
        lng
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error.message);
    return [];
  }

  // Map data to a consistent format
  return (
    data?.map(fav => ({
      id: fav.id,
      shop_id: fav.shop_id,
      address: fav.address,
      created_at: fav.created_at,
      shop: {
        id: fav.shops?.id,
        name: fav.shops?.name,
        address: fav.shops?.address,
        city: fav.shops?.city,
        lat: fav.shops?.lat,
        lng: fav.shops?.lng,
      },
    })) || []
  );
}

async function addToFavorites(shop) {
  console.log('Adding to favorites:', shop.name);
  const { data: authData, error: authError } = await client.auth.getUser();
  const userId = authData?.user?.id;

  if (authError || !userId) {
    console.error('No user authenticated:', authError?.message);
    showAuthBanner(shop, () => addToFavorites(shop)); // Prompt login and retry
    return;
  }

  if (!shop || !shop.name || !shop.address || !shop.city) {
    console.error('Invalid shop data:', shop);
    alert('Cannot add to favorites: Invalid shop data.');
    return;
  }

  // Get or create shop in the shops table
  let shopId;
  try {
    shopId = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
    console.log('Shop ID retrieved or created:', shopId);
  } catch (error) {
    console.error('Error getting or creating shop:', error.message);
    alert('Failed to add shop to favorites: Could not retrieve shop ID.');
    return;
  }

  // Check for existing favorite
  const { data: existingFavorites, error: fetchError } = await client
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('shop_id', shopId);

  if (fetchError) {
    console.error('Error checking existing favorites:', fetchError.message);
    alert('Failed to check favorites: ' + fetchError.message);
    return;
  }

  if (existingFavorites.length > 0) {
    console.log(`${shop.name} is already in favorites`);
    alert(`${shop.name} is already in your favorites.`);
    return;
  }

  // Insert new favorite
  const { data, error: insertError } = await client
    .from('favorites')
    .insert({
      user_id: userId,
      shop_id: shopId,
      address: shop.address,
    })
    .select('id, shop_id, address, created_at')
    .single();

  if (insertError) {
    console.error('Error adding to favorites:', insertError.message);
    alert('Failed to add to favorites: ' + insertError.message);
    return;
  }

  console.log(`Added ${shop.name} to favorites with shop_id: ${shopId}`);
  // Update local favorites array
  favorites.push({
    id: data.id,
    shop_id: shopId,
    address: shop.address,
    created_at: data.created_at,
    shop: {
      id: shopId,
      name: shop.name,
      address: shop.address,
      city: shop.city,
      lat: shop.lat,
      lng: shop.lng,
    },
  });
  await updateFavoritesModal();

  // Update favorite button UI
  const floatingCard = document.getElementById('floating-card');
  if (floatingCard) {
    const favoriteButton = floatingCard.querySelector('#favorite-button');
    if (favoriteButton) {
      favoriteButton.querySelector('svg').setAttribute('fill', 'currentColor');
      favoriteButton.setAttribute('aria-label', `Remove ${shop.name} from favorites`);
    }
  }
}

async function updateFavoritesModal() {
  console.log('Updating favorites modal');
  const favoritesList = document.getElementById('favorites-list');
  if (!favoritesList) {
    console.error('Favorites list element not found');
    return;
  }

  favoritesList.innerHTML = '<p class="favorite-modal-loading">Loading favorites...</p>';

  try {
    const favoritesData = await fetchFavorites();
    if (favoritesData.length === 0) {
      favoritesList.innerHTML = '<p class="favorite-modal-loading">No favorite shops yet.</p>';
      console.log('No favorites to display');
      return;
    }

    favoritesList.className = 'favorite-modal-list';
    favoritesList.innerHTML = '';

    // Update global favorites array
    favorites = favoritesData;

    favoritesData.forEach(fav => {
      const shop = fav.shop;
      if (!shop) {
        console.warn('No shop data for favorite:', fav.shop_id);
        return;
      }
      const li = document.createElement('li');
      li.className = 'favorite-modal-list-item';
      li.dataset.shopId = fav.shop_id; // Store shop_id for event handling
      li.innerHTML = `
        <span class="favorite-modal-shop-info">${shop.name} (${shop.address}, ${shop.city})</span>
        <div class="favorite-modal-actions">
          <button class="favorite-modal-button view-shop" aria-label="View ${shop.name}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button class="favorite-modal-button remove" aria-label="Remove ${shop.name} from favorites">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;
      favoritesList.appendChild(li);
    });

    // Remove existing listeners to prevent duplicates
    favoritesList.removeEventListener('click', handleFavoritesButtonClick);

    // Add delegated event listener
    favoritesList.addEventListener('click', handleFavoritesButtonClick);
    console.log('Attached delegated click listener to favoritesList');
  } catch (error) {
    console.error('Error updating favorites modal:', error.message);
    favoritesList.innerHTML = '<p class="favorite-modal-loading">Error loading favorites.</p>';
  }
}

// Delegated event handler for favorites modal buttons
async function handleFavoritesButtonClick(e) {
  const target = e.target.closest('.favorite-modal-button');
  if (!target) return;

  e.stopPropagation();
  const li = target.closest('li');
  const shopId = li.dataset.shopId;
  const fav = favorites.find(f => f.shop_id === shopId);

  if (!fav || !fav.shop) {
    console.error('Favorite or shop not found for shop_id:', shopId);
    return;
  }

  const shop = fav.shop;

  if (target.classList.contains('view-shop')) {
    console.log('Viewing shop from favorites:', shop.name);
    currentShop = {
      id: shop.id,
      name: shop.name,
      address: shop.address,
      city: shop.city,
      lat: shop.lat,
      lng: shop.lng,
    };
    try {
      showShopDetails(currentShop);
      document.getElementById('favorite-modal').classList.add('hidden');
      console.log('Favorite modal hidden');
    } catch (error) {
      console.error('Error showing shop details:', error);
    }
  } else if (target.classList.contains('remove')) {
    const { data: authData, error: authError } = await client.auth.getUser();
    const userId = authData?.user?.id;
    if (authError || !userId) {
      console.error('No user authenticated:', authError?.message);
      showAuthBanner(null, () => handleFavoritesButtonClick(e)); // Prompt login and retry
      return;
    }

    const { error } = await client
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('shop_id', shopId);

    if (error) {
      console.error('Error removing favorite:', error.message);
      alert('Failed to remove favorite: ' + error.message);
    } else {
      console.log('Removed from favorites:', shop.name);
      favorites = favorites.filter(f => f.shop_id !== shopId);
      await updateFavoritesModal();

      // Update floating card if showing the removed shop
      const floatingCard = document.getElementById('floating-card');
      if (floatingCard && currentShop && currentShop.id === shopId) {
        const favoriteButton = floatingCard.querySelector('#favorite-button');
        if (favoriteButton) {
          favoriteButton.querySelector('svg')?.setAttribute('fill', 'none');
          favoriteButton.setAttribute('aria-label', `Add ${shop.name} to favorites`);
        }
      }
    }
  }
}



document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await client.auth.getSession();
  const authBanner = document.getElementById('auth-banner');

  if (session?.user) {
    // User is logged in — hide the banner
    authBanner?.classList.add('hidden');
    console.log('User is already logged in:', session.user.email);
  } else {
    // User is not logged in — show the banner
    showAuthBanner(); // only if you want dynamic rendering
  }
});


document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initial floating-card state:', document.getElementById('floating-card')?.classList.contains('hidden') ? 'hidden' : 'visible');

  const navButtons = [
    { id: 'cities-button', modalId: 'cities-modal' },
    { id: 'top-100-button', modalId: 'top100-modal' },
    { id: 'favorites-button', modalId: 'favorite-modal' }
  ];

  function setupNavButton({ id, modalId }) {
    const button = document.getElementById(id);
    const modal = document.getElementById(modalId);

    if (!button) {
      console.error(`Navigation button not found: #${id}`);
      return false;
    }
    if (!modal) {
      console.error(`Modal not found: #${modalId}`);
      button.setAttribute('disabled', 'true');
      button.classList.add('opacity-50', 'cursor-not-allowed');
      return false;
    }

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`Clicked ${id}, toggling ${modalId}`);

      document.querySelectorAll('#filter-modal, #cities-modal, #top100-modal, #favorite-modal')
        .forEach(m => m.classList.add('hidden'));
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

      modal.classList.remove('hidden');
      button.classList.add('active');

      if (modalId === 'favorite-modal') {
        updateFavoritesModal();
      }

      if (modalId === 'top100-modal') {
        displayTop100Shops();
      }

      if (modalId === 'cities-modal') {
        fetchNearbyCities();
      }

      console.log(`${modalId} state:`, modal.classList.contains('hidden') ? 'hidden' : 'visible');
    });

    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });

    console.log(`Successfully set up button: ${id} -> ${modalId}`);
    return true;
  }

  function setupNavButtons() {
    let successful = 0;
    navButtons.forEach(nav => {
      if (setupNavButton(nav)) {
        successful++;
      }
    });

    if (successful < navButtons.length) {
      console.error(`Failed to set up ${navButtons.length - successful} navigation buttons`);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white p-4 rounded';
      errorDiv.textContent = 'Some navigation features are unavailable. Please refresh the page.';
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000);
    } else {
      console.log('All navigation buttons set up successfully');
    }
  }

  setupNavButtons();

  const favoriteButton = document.getElementById('favorite-button');
  const floatingCard = document.getElementById('floating-card');

  if (favoriteButton && floatingCard) {
    favoriteButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const shopName = floatingCard.querySelector('h3').childNodes[2].textContent.trim();
      const address = floatingCard.querySelectorAll('p')[0].childNodes[2].textContent.trim();
      const rating = floatingCard.querySelectorAll('p')[1].childNodes[2].textContent.trim().replace('Rating: ', '');

      const shop = {
        name: shopName,
        address: address,
        rating: rating
      };

      addToFavorites(shop);
    });
  }

  document.addEventListener('click', function(e) {
    const modals = document.querySelectorAll('#filter-modal, #cities-modal, #top100-modal, #favorite-modal');
    const isClickInsideModal = Array.from(modals).some(modal => modal.contains(e.target));
    const isClickOnNavButton = navButtons.some(({ id }) => document.getElementById(id)?.contains(e.target));
    if (!isClickInsideModal && !isClickOnNavButton) {
      modals.forEach(modal => {
        if (!modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
          console.log(`Closed modal: ${modal.id} (clicked outside)`);
        }
      });
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    }
  });

  document.querySelectorAll('#filter-modal, #cities-modal, #top100-modal, #favorite-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  document.querySelectorAll('.close-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const modal = button.closest('.modal');
      if (modal) {
        modal.classList.add('hidden');
        console.log(`Closed modal: ${modal.id} (via close button)`);
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      }
    });
  });

  try {
  var map = L.map('map').setView([48.8566, 2.3522], 13);
  console.log('Map initialized successfully');

  var tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© Carto',
  }).addTo(map);

  tileLayer.on('tileerror', function(error) {
    console.error('Tile loading error with OpenStreetMap:', error);
    console.error('Tile URL attempted:', error.tile.src);
    console.warn('Attempting fallback tile provider (Stamen Terrain)...');

    map.removeLayer(tileLayer);

    var fallbackTileLayer = L.tileLayer('https://{s}.tile.stamen.com/terrain/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© Stamen Design'
    }).addTo(map);

    fallbackTileLayer.on('tileerror', function(fallbackError) {
      console.error('Fallback tile loading error with Stamen Terrain:', fallbackError);
      console.error('Fallback tile URL attempted:', fallbackError.tile.src);
      document.getElementById('map')?.classList.add('map-failed');
    });

    fallbackTileLayer.on('load', function() {
      console.log('Fallback tiles (Stamen Terrain) loaded successfully');
    });
  });

  tileLayer.on('load', function() {
    console.log('OpenStreetMap tiles loaded successfully');
  });

  // Neumorphic-style marker with proper class
  const coffeeIcon = L.divIcon({
    className: 'custom-neumorphic-icon',
    html: '<div class="neumorphic-marker"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  // Use coffeeIcon for the initial marker
  L.marker([48.8566, 2.3522], { icon: coffeeIcon })
    .addTo(map)
    .bindPopup("Neumorphic Coffee Shop");

  setTimeout(function() {
    map.invalidateSize();
    console.log('Map size recalculated');
  }, 100);

  const searchInput = document.getElementById('search-bar');
  const searchDropdown = document.getElementById('search-dropdown');
  let autocompleteService;
  let placesService;
  let geocoder;
  let userLocation = null;
  let currentShop = null;
  let filterState = {
    parking: false,
    petFriendly: false,
    specialtyCoffee: false
  };
  let currentMarkers = [];
  let shops = [];
  let reviews = [];
  let cityCoordinates = {};
  const currentUser = "user123";

    function extractCityFromAddressComponents(addressComponents) {
      if (!addressComponents) return "Unknown City";
      const cityComponent = addressComponents.find(component => 
        component.types.includes("locality") || component.types.includes("administrative_area_level_2")
      );
      return cityComponent ? cityComponent.long_name.toLowerCase() : "Unknown City";
    }

    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    }

// Global favorites array
let favorites = [];

window.initGoogleMaps = async function() {
  console.log('Google Maps API loaded successfully');
  try {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      const autocompleteService = new google.maps.places.AutocompleteService();
      const placesService = new google.maps.places.PlacesService(document.createElement('div'));
      const geocoder = new google.maps.Geocoder();
      console.log('AutocompleteService initialized');
      console.log('PlacesService initialized');
      console.log('Geocoder initialized');

      // Load favorites from Supabase
      async function loadFavorites() {
        try {
          const { data: user } = await client.auth.getUser();
          if (!user?.user?.id) {
            console.log('No authenticated user, setting empty favorites');
            favorites = [];
            return;
          }
          const { data, error } = await client
            .from('favorites')
            .select('shop_id, address')
            .eq('user_id', user.user.id);
          if (error) throw error;
          favorites = data || [];
          console.log('Favorites loaded:', favorites);
        } catch (error) {
          console.error('Error loading favorites:', error);
          favorites = [];
        }
      }
      await loadFavorites();

      searchInput.disabled = false;
      searchInput.placeholder = 'Search for coffee shops...';
      console.log('Search bar enabled');

      // Autocomplete event listener
      searchInput.addEventListener('input', debounce(function() {
        const query = searchInput.value.trim();
        if (!query || !autocompleteService) {
          searchDropdown.classList.add('hidden');
          return;
        }
        autocompleteService.getPlacePredictions(
          {
            input: query,
            types: ['establishment'],
            componentRestrictions: { country: 'za' },
          },
          (predictions, status) => {
            console.log('Autocomplete status:', status, 'Predictions:', predictions);
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              searchDropdown.innerHTML = predictions
                ? predictions.map(pred => `<li data-place-id="${pred.place_id}">${pred.description}</li>`).join('')
                : '';
              searchDropdown.classList.remove('hidden');
              searchDropdown.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', async () => {
                  const placeId = item.getAttribute('data-place-id');
                  placesService.getDetails({ placeId }, async (place, status) => {
                    if (place && status === google.maps.places.PlacesServiceStatus.OK) {
                      const shop = {
                        name: place.name,
                        address: place.formatted_address,
                        phone: place.formatted_phone_number,
                        website: place.website,
                        rating: place.rating,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        city: extractCityFromAddressComponents(place.address_components) || 'Unknown',
                      };

                      currentShop = shop;
                      showFloatingCard(shop);
                      if (map) {
                        map.setView([shop.lat, shop.lng], 15);
                        currentMarkers.forEach(marker => map.removeLayer(marker));
                        currentMarkers = [];
                        const marker = L.marker([shop.lat, shop.lng], { icon: coffeeIcon })
                          .addTo(map)
                          .bindPopup(shop.name)
                          .openPopup();
                        // Add click event to show floating card
                        marker.on('click', () => {
                          console.log('Marker clicked for:', shop.name);
                          showFloatingCard(shop);
                        });
                        currentMarkers.push(marker);
                      } else {
                        console.error('Leaflet map not initialized');
                      }
                      searchDropdown.classList.add('hidden');
                      searchInput.value = place.name;
                    } else {
                      console.error('Place details fetch failed:', status);
                    }
                  });
                });
              });
            } else {
              searchDropdown.classList.add('hidden');
              console.error('Autocomplete failed:', status);
            }
          }
        );
      }, 300));

      await loadReviewMarkers();

      // Direct search on Enter key
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query && placesService) {
            const request = {
              query: `coffee shop ${query}`,
              location: map ? map.getCenter() : null,
              radius: 5000,
              type: 'cafe'
            };
            placesService.textSearch(request, (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                console.log('Search results:', results);
                displayFilteredShops(results);
                searchDropdown.classList.add('hidden');
              } else {
                console.error('Search failed:', status);
                document.getElementById('filtered-shops-list').innerHTML = '<p>No shops found.</p>';
              }
            });
          }
        }
      });
    } else {
      throw new Error('Google Maps Places API failed to load.');
    }
  } catch (error) {
    console.error('Error initializing Google Maps services:', error);
    searchInput.disabled = true;
    searchInput.placeholder = 'Search unavailable';
  }
};

setTimeout(() => {
  if (searchInput.disabled) {
    console.warn('Google Maps API failed to load within 10 seconds.');
    searchInput.disabled = false;
    searchInput.placeholder = 'Search unavailable';
  }
}, 10000);
    function generatePointsAroundLocation(lat, lng, radius, numPoints = 8) {
      const points = [];
      const earthRadius = 6371000; // Earth's radius in meters
      const latRad = lat * Math.PI / 180;
      const lngRad = lng * Math.PI / 180;

      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 360 / numPoints) * Math.PI / 180;
        const newLat = lat + (radius / earthRadius) * (180 / Math.PI) * Math.cos(angle);
        const newLng = lng + (radius / earthRadius) * (180 / Math.PI) * Math.sin(angle) / Math.cos(latRad);
        points.push({ lat: newLat, lng: newLng });
      }

      points.push({ lat, lng });
      return points;
    }

    async function loadReviewMarkers() {
  try {
    // Check map and icon availability
    if (!map) {
      console.error('Leaflet map is not initialized');
      return;
    }
    if (!coffeeIcon) {
      console.error('coffeeIcon is not defined');
      return;
    }

    // Fetch reviews with associated shop details
    const { data: reviews, error } = await client
      .from('reviews')
      .select('rating, shop:shop_id(id, name, address, city, lat, lng)')

    if (error) {
      console.error('Error fetching reviews:', error.message);
      throw error;
    }

    if (!reviews || reviews.length === 0) {
      console.warn('No reviews found in database.');
      return;
    }

    const addedShops = new Set();

    reviews.forEach(review => {
      const shop = review.shop;
      if (
        !shop ||
        !shop.id ||
        typeof shop.lat !== 'number' ||
        typeof shop.lng !== 'number' ||
        addedShops.has(shop.id)
      ) {
        console.warn('Skipping review due to invalid or duplicate shop data:', shop);
        return;
      }

      const marker = L.marker([shop.lat, shop.lng], { icon: coffeeIcon })
        .addTo(map)
        .bindPopup(`${shop.name}<br>Rating: ${review.rating}`);

      marker.on('click', () => {
        showFloatingCard({
          ...shop,
          address: shop.address || 'Unknown Address',
          city: shop.city || 'Unknown City',
        });
      });

      currentMarkers.push(marker);
      addedShops.add(shop.id);
    });

    console.log(`Added ${addedShops.size} review markers to the map`);
  } catch (err) {
    console.error('Error loading review markers:', err);
  }
}



   async function fetchNearbyCities() {
  const citiesModal = document.getElementById('cities-modal');
  const cityButtonsContainer = document.getElementById('city-buttons');
  const searchInput = document.getElementById('city-search');
  if (!citiesModal || !cityButtonsContainer || !searchInput) {
    return console.error('Cities modal, buttons container, or search input not found');
  }
  if (!supabase) return console.error('Supabase not initialized.');

  // Get user ID
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  // Fetch cities from Supabase
  const { data: shops, error } = await supabase.from('shops').select('city');
  if (error) return console.error('Error fetching cities:', error);
  const allCities = [...new Set(shops.map(shop => shop.city.trim().toLowerCase()))].sort();

  // Get location
  let [lat, lng] = userLocation?.length === 2 ? userLocation : map?.getCenter ? [map.getCenter().lat, map.getCenter().lng] : [0, 0];

  const cityCoords = {
    'cape town': [-33.9249, 18.4241],
    'johannesburg': [-26.2041, 28.0473],
    'durban': [-29.8587, 31.0218],
  };

  const distances = Object.entries(cityCoords)
    .map(([city, [cLat, cLng]]) => ({
      city,
      distance: Math.hypot(cLat - lat, cLng - lng)
    }))
    .sort((a, b) => a.distance - b.distance);

  const nearbyCities = distances.slice(0, 3).map(d => d.city);

  // Fetch behavior-based cities
  let recentCities = [], popularCities = [];
  if (userId) {
    const { data: recent } = await supabase
      .from('city_activity')
      .select('city')
      .eq('user_id', userId)
      .order('last_visited_at', { ascending: false })
      .limit(5);
    recentCities = recent?.map(c => c.city.toLowerCase()) || [];
  }

  const { data: popular } = await supabase
    .from('city_activity')
    .select('city, visit_count')
    .order('visit_count', { ascending: false })
    .limit(5);
  popularCities = popular?.map(c => c.city.toLowerCase()) || [];

  // Render helper
  const renderButtons = (title, cities) => cities.length ? `
    <div class="city-section mb-3">
      <h4 class="section-title text-sm font-semibold mb-1">${title}</h4>
      <div class="cities-modal-buttons flex flex-wrap gap-2">
        ${cities.map(city => `
          <button class="cities-modal-button px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition" data-city="${city}">
            ${city.charAt(0).toUpperCase() + city.slice(1)}
          </button>`).join('')}
      </div>
    </div>` : '';

  // Render initial city buttons
  const renderCitySections = (searchQuery = '') => {
    const matches = searchQuery ? allCities.filter(c => c.includes(searchQuery.toLowerCase().trim())) : allCities;
    cityButtonsContainer.innerHTML = searchQuery
      ? renderButtons('Search Results', matches)
      : `
        ${renderButtons('Recently Visited', recentCities)}
        ${renderButtons('Popular Cities', popularCities)}
        ${renderButtons('Nearby Cities', nearbyCities)}
        ${renderButtons('All Cities', allCities)}
      `;
    // Bind city button listeners
    cityButtonsContainer.querySelectorAll('.cities-modal-button').forEach(btn =>
      btn.addEventListener('click', () => handleCityClick(btn.dataset.city))
    );
  };

  // City click handler
  async function handleCityClick(city) {
    const lowerCity = city.toLowerCase();
    const [cityLat, cityLng] = cityCoords[lowerCity] || [lat, lng];
    cityCoordinates[lowerCity] = [cityLat, cityLng];
    if (map) {
      map.setView([cityLat, cityLng], 13);
      map.invalidateSize();
    }
    fetchShopsByCity(lowerCity, selectedRatingFilter);
    citiesModal.classList.add('hidden');

    if (userId) {
      const { error } = await supabase
        .from('city_activity')
        .upsert(
          {
            user_id: userId,
            city: lowerCity,
            visit_count: 1,
            last_visited_at: new Date().toISOString()
          },
          {
            onConflict: ['user_id', 'city'],
            update: { visit_count: { increment: 1 }, last_visited_at: new Date().toISOString() }
          }
        );
      if (error) console.error('Tracking error:', error);
    }
  }

  // Initialize
  renderCitySections();
  citiesModal.classList.remove('hidden');

  // Search handler
  searchInput.addEventListener('input', () => renderCitySections(searchInput.value));

  // Rating filter handler
  let selectedRatingFilter = '';
  const ratingFilters = document.querySelectorAll('input[name="rating-filter"]');
  ratingFilters.forEach(radio => {
    radio.addEventListener('change', () => {
      selectedRatingFilter = radio.value;
      const selectedCity = cityButtonsContainer.querySelector('.cities-modal-button.active')?.dataset.city;
      if (selectedCity) fetchShopsByCity(selectedCity, selectedRatingFilter);
    });
  });

  // Close modal
  const closeButton = citiesModal.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => citiesModal.classList.add('hidden'));
  }
}


    // Renamed to avoid naming conflict
async function fetchCities() {
  const citiesModal = document.getElementById('cities-modal');
  const cityButtonsContainer = document.getElementById('city-buttons');
  const searchInput = document.getElementById('city-search');
  if (!citiesModal || !cityButtonsContainer || !searchInput) {
    showError('Cities modal, buttons container, or search input not found');
    return;
  }
  if (!supabase) {
    showError('Supabase not initialized.');
    return;
  }

  // Initialize Leaflet map if not already set
  if (!map) {
    map = L.map('map').setView([-33.9249, 18.4241], 13); // Default: Cape Town
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
  }

  // Get user ID
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error('Auth error:', authError);
    showError('Failed to authenticate user. Please try again.');
    return;
  }
  const userId = authData?.user?.id;

  // Fetch cities from Supabase
  const { data: shops, error: shopsError } = await supabase.from('shops').select('city');
  if (shopsError) {
    console.error('Error fetching cities:', shopsError);
    showError('Failed to load cities. Please try again.');
    return;
  }
  const allCities = [...new Set(shops.map(shop => shop.city.trim().toLowerCase()))].sort();

  // Get location
  let [lat, lng] = userLocation?.length === 2 ? userLocation : [map.getCenter().lat(), map.getCenter().lng()];

  const cityCoords = {
    'cape town': [-33.9249, 18.4241],
    'johannesburg': [-26.2041, 28.0473],
    'durban': [-29.8587, 31.0218],
  };

  const distances = Object.entries(cityCoords)
    .map(([city, [cLat, cLng]]) => ({
      city,
      distance: Math.hypot(cLat - lat, cLng - lng)
    }))
    .sort((a, b) => a.distance - b.distance);

  const nearbyCities = distances.slice(0, 3).map(d => d.city);

  // Fetch behavior-based cities
  let recentCities = [], popularCities = [];
  if (userId) {
    const { data: recent, error: recentError } = await supabase
      .from('city_activity')
      .select('city')
      .eq('user_id', userId)
      .order('last_visited_at', { ascending: false })
      .limit(5);
    if (recentError) {
      console.error('Error fetching recent cities:', recentError);
      showError('Failed to load recent cities.');
    } else {
      recentCities = recent?.map(c => c.city.toLowerCase()) || [];
    }
  }

  const { data: popular, error: popularError } = await supabase
    .from('city_activity')
    .select('city, visit_count')
    .order('visit_count', { ascending: false })
    .limit(5);
  if (popularError) {
    console.error('Error fetching popular cities:', popularError);
    showError('Failed to load popular cities.');
  } else {
    popularCities = popular?.map(c => c.city.toLowerCase()) || [];
  }

  // Render helper
  const renderButtons = (title, cities) => cities.length ? `
    <div class="city-section mb-3">
      <h4 class="section-title text-sm font-semibold mb-1">${title}</h4>
      <div class="cities-modal-buttons flex flex-wrap gap-2">
        ${cities.map(city => `
          <button class="cities-modal-button px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition" data-city="${city}">
            ${city.charAt(0).toUpperCase() + city.slice(1)}
          </button>`).join('')}
      </div>
    </div>` : '';

  // Render city sections
  const renderCitySections = (searchQuery = '') => {
    const matches = searchQuery ? allCities.filter(c => c.includes(searchQuery.toLowerCase().trim())) : allCities;
    cityButtonsContainer.innerHTML = searchQuery
      ? renderButtons('Search Results', matches)
      : `
        ${renderButtons('Recently Visited', recentCities)}
        ${renderButtons('Popular Cities', popularCities)}
        ${renderButtons('Nearby Cities', nearbyCities)}
        ${renderButtons('All Cities', allCities)}
      `;
    // Bind city button listeners
    cityButtonsContainer.querySelectorAll('.cities-modal-button').forEach(btn => {
      btn.addEventListener('click', () => {
        cityButtonsContainer.querySelectorAll('.cities-modal-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        handleCityClick(btn.dataset.city);
      });
    });
  };

  // City click handler
  async function handleCityClick(city) {
    const lowerCity = city.toLowerCase();
    const [cityLat, cityLng] = cityCoords[lowerCity] || [lat, lng];
    window.cityCoordinates = window.cityCoordinates || {};
    window.cityCoordinates[lowerCity] = [cityLat, cityLng];
    map.setView([cityLat, cityLng], 13);
    map.invalidateSize();
    await fetchShopsByCity(lowerCity, selectedRatingFilter);
    citiesModal.classList.add('hidden');

    if (userId) {
      const { error } = await supabase
        .from('city_activity')
        .upsert(
          {
            user_id: userId,
            city: lowerCity,
            visit_count: 1,
            last_visited_at: new Date().toISOString(),
          },
          {
            onConflict: ['user_id', 'city'],
            update: {
              visit_count: supabase.sql('visit_count + 1'),
              last_visited_at: new Date().toISOString(),
            }
          }
        );
      if (error) {
        console.error('Error tracking city activity:', error);
        showError('Failed to track city selection.');
      }
    }
  }

  // Error display helper
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500 p-2 mb-2';
    errorDiv.textContent = message;
    cityButtonsContainer.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
  }

  // Initialize
  let selectedRatingFilter = '';
  renderCitySections();
  citiesModal.classList.remove('hidden');

  // Search handler (with debounce)
  let debounceTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => renderCitySections(searchInput.value), 300);
  });

  // Rating filter handler
  const ratingFilters = document.querySelectorAll('input[name="rating-filter"]');
  ratingFilters.forEach(radio => {
    radio.addEventListener('change', async () => {
      selectedRatingFilter = radio.value;
      const selectedCity = cityButtonsContainer.querySelector('.cities-modal-button.active')?.dataset.city;
      if (selectedCity) {
        await fetchShopsByCity(selectedCity, selectedRatingFilter);
      }
    });
  });

  // Close modal
  const closeButton = citiesModal.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => citiesModal.classList.add('hidden'));
  }
}

  // Update geolocation markers
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      userLocation = [position.coords.latitude, position.coords.longitude];
      map.setView(userLocation, 13);
      const userMarker = L.marker(userLocation, { icon: coffeeIcon })
        .addTo(map)
        .bindPopup('You are here')
        .openPopup();
      console.log('Initial user location set:', userLocation);
    }, function(error) {
      console.error('Initial geolocation error, falling back to default location:', error);
      userLocation = [48.8566, 2.3522];
      map.setView(userLocation, 13);
      const defaultMarker = L.marker(userLocation, { icon: coffeeIcon })
        .addTo(map)
        .bindPopup('Default location (Paris)')
        .openPopup();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  } else {
    console.warn('Geolocation not supported, using default location.');
    userLocation = [48.8566, 2.3522];
    map.setView(userLocation, 13);
    const defaultMarker = L.marker(userLocation, { icon: coffeeIcon })
      .addTo(map)
      .bindPopup('Default location (Paris)')
      .openPopup();
  }

  const userLocationButton = document.getElementById('user-location-button');
  if (userLocationButton) {
    userLocationButton.addEventListener('click', function() {
      console.log('User location button clicked');
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported by this browser');
        alert('Geolocation is not supported by your browser.');
        return;
      }

      userLocationButton.disabled = true;
      userLocationButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6 text-gray-600 animate-spin">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v2a2 2 0 002 2h12a2 2 0 002-2V4M8 12h8M10 16h4"/>
        </svg>
        Locating...
      `;

      navigator.geolocation.getCurrentPosition(
        function(position) {
          const newLocation = [position.coords.latitude, position.coords.longitude];
          console.log('User location retrieved:', newLocation);
          userLocation = newLocation;
          if (map) {
            map.setView(userLocation, 13);
            const userMarker = L.marker(userLocation, { icon: coffeeIcon })
              .addTo(map)
              .bindPopup('You are here')
              .openPopup();
            map.invalidateSize();
            console.log('Map centered on user location:', userLocation);
          } else {
            console.error('Map object is not initialized');
          }

          userLocationButton.disabled = false;
          userLocationButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          `;
        },
        function(error) {
          console.error('Failed to retrieve user location:', error.message, error.code);
          let errorMessage = 'Unable to access your location: ' + error.message;
          if (error.code === 1) {
            errorMessage += ' (Please allow location access in your browser settings)';
          } else if (error.code === 3) {
            errorMessage += ' (Timeout occurred despite initial success; using last known location)';
          }
          alert(errorMessage);

          userLocation = userLocation || [48.8566, 2.3522];
          if (map) {
            map.setView(userLocation, 13);
            const fallbackMarker = L.marker(userLocation, { icon: coffeeIcon })
              .addTo(map)
              .bindPopup(userLocation === [48.8566, 2.3522] ? 'Default location (Paris)' : 'Last known location')
              .openPopup();
            map.invalidateSize();
            console.log('Map centered on fallback location:', userLocation);
          }

          userLocationButton.disabled = false;
          userLocationButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          `;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  } else {
    console.error('User location button not found in DOM');
  }
    
    async function getOrCreateShop(name, address, city, lat, lng) {
  try {
    const { data, error } = await client.rpc('get_or_create_shop', {
      p_name: name,
      p_address: address,
      p_city: city,
      p_lat: lat,
      p_lng: lng,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);
    if (!data || data.length === 0) throw new Error('No shop ID returned');

    return data[0].id;
  } catch (err) {
    console.error('Error in getOrCreateShop:', err.message || err);
    throw err;
  }
}



    async function calculateAverageRating(shopName, shopId = null) {
  try {
    // If no shopId is provided, attempt to look it up by name
    if (!shopId) {
      const trimmedName = shopName.trim();
      console.log(`Looking up shop ID for name: "${trimmedName}"`);

      const { data, error } = await client
        .from('shops')
        .select('id')
        .ilike('name', `%${trimmedName}%`); // Case-insensitive + partial match

      if (error) throw new Error(`Supabase error: ${error.message}`);
      if (!data || data.length === 0) {
        console.warn(`No shop found with name: "${trimmedName}"`);
        return 0;
      }

      shopId = data[0].id;
    }

    // Fetch reviews for the identified shop
    const { data: reviews, error: reviewError } = await client
      .from('reviews')
      .select('rating')
      .eq('shop_id', shopId);

    if (reviewError) {
      console.error('Error fetching reviews:', reviewError);
      return 0;
    }

    if (!reviews || reviews.length === 0) {
      console.log(`No reviews found for shop: ${shopName}`);
      return 0;
    }

    // Calculate average rating
    const total = reviews.reduce((sum, review) => sum + Number(review.rating), 0);
    const average = total / reviews.length;
    return average.toFixed(1);
  } catch (error) {
    console.error('Error in calculateAverageRating:', error.message || error);
    return 0;
  }
}



  async function showFloatingCard(shop) {
  if (!shop || !shop.name || !shop.address || !shop.city) {
    console.warn('Invalid shop data:', shop);
    document.getElementById('floating-card')?.classList.add('hidden');
    return;
  }
  console.log('Showing floating card for:', shop.name);

  // Get or create shop to ensure we have a shop_id
  let shopId;
  try {
    shopId = await getOrCreateShop(shop.name, shop.address, shop.city, shop.lat, shop.lng);
    shop.id = shopId; // Add shop_id to shop object
  } catch (error) {
    console.error('Error getting shop ID:', error);
    shop.id = null;
  }

  let averageRating = 0;
  try {
    averageRating = await calculateAverageRating(shop.name);
  } catch (error) {
    console.error('Error calculating average rating:', error);
  }
  const displayRating = averageRating > 0 ? `${averageRating} / 10` : 'No ratings yet';

  const isFavorited = shop.id
    ? favorites.some(fav => fav.shop_id === shop.id)
    : false;

  const coffeeIcon = `<svg class="text-brown-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`;
  const starIcon = `<svg class="text-yellow-500" fill="black" viewBox="0 0 24 24" width="16" height="16"><path d="M12 .587l3.668 7.431 8.332 1.151-6.001 5.822 1.417 8.262L12 18.707l-7.416 3.504 1.417-8.262-6.001-5.822 8.332-1.151z"/></svg>`;

  const floatingCard = document.getElementById('floating-card');
  if (!floatingCard) {
    console.error('Floating card element not found');
    return;
  }

  const addressFirstLine = shop.address ? shop.address.split('\n')[0].trim().split(',')[0].trim() : 'Unknown Location';

  floatingCard.innerHTML = `
    <button class="floating-card-close-button" aria-label="Close ${shop.name} details">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h3 class="floating-card-heading">${shop.name}</h3>
    <p class="floating-card-info">${addressFirstLine} ${starIcon} ${displayRating}</p>
    <div class="floating-card-actions">
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
      <button id="share-button" class="floating-card-action-button" aria-label="Share ${shop.name}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span>Share</span>
      </button>
      <button id="favorite-button" class="floating-card-action-button" aria-label="${isFavorited ? `Remove ${shop.name} from favorites` : `Add ${shop.name} to favorites`}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="${isFavorited ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span>Favorite</span>
      </button>
    </div>
  `;

  floatingCard.style.display = 'block';
  floatingCard.style.visibility = 'visible';
  floatingCard.style.opacity = '1';
  floatingCard.style.zIndex = '1007';
  floatingCard.classList.remove('hidden');
  console.log('Floating card displayed for:', shop.name);

  // Function to create and show the custom maps prompt modal
  function showMapsPrompt(shop, callback) {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'maps-prompt-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1008';

    // Create modal content with floating-card styling
    modal.innerHTML = `
      <div style="backdrop-filter: blur(50px); -webkit-backdrop-filter: blur(5px); background: rgba(255, 255, 255, 0.15); border: 0.5px solid black; box-shadow: 5px 5px 10px rgba(209, 209, 209, 0.5), -5px -5px 10px rgba(255, 255, 255, 0.6), inset 3px 3px 6px rgba(209, 209, 209, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.6); border-radius: 15px; padding: 15px; width: 85%; max-width: 350px; text-align: center;">
        <p style="margin-bottom: 20px; color: #333; font-size: 16px;">Choose a maps service for directions to ${shop.name}</p>
        <button id="google-maps-btn" style="background: rgba(255, 255, 255, 0.2); border: 0.5px solid #333; box-shadow: 2px 2px 4px rgba(209, 209, 209, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.3); border-radius: 8px; padding: 8px 16px; margin-right: 10px; cursor: pointer; color: #333; font-size: 14px;">Google Maps</button>
        <button id="apple-maps-btn" style="background: rgba(255, 255, 255, 0.2); border: 0.5px solid #333; box-shadow: 2px 2px 4px rgba(209, 209, 209, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.3); border-radius: 8px; padding: 8px 16px; cursor: pointer; color: #333; font-size: 14px;">Apple Maps</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Add event listeners for the buttons
    document.getElementById('google-maps-btn').addEventListener('click', () => {
      callback(true); // true for Google Maps
      modal.remove();
    });
    document.getElementById('apple-maps-btn').addEventListener('click', () => {
      callback(false); // false for Apple Maps
      modal.remove();
    });

    // Close modal if clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Close button listener
  const closeButton = floatingCard.querySelector('.floating-card-close-button');
  if (closeButton) {
    closeButton.addEventListener('click', function(e) {
      e.stopPropagation();
      floatingCard.classList.add('hidden');
      console.log('Floating card closed');
    });
  }

  // Button listeners
  document.getElementById('call-button')?.addEventListener('click', function(e) {
    e.stopPropagation();
    if (shop.phone) window.location.href = `tel:${shop.phone}`;
  });

  document.getElementById('directions-button')?.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!shop.address && (!shop.lat || !shop.lng)) {
      console.error('No valid address or coordinates provided for directions');
      alert('Unable to get directions: No valid address or coordinates available.');
      return;
    }

    // Show custom modal
    showMapsPrompt(shop, (useGoogleMaps) => {
      let directionsUrl;
      try {
        if (useGoogleMaps) {
          // Google Maps directions
          if (shop.lat && shop.lng && !isNaN(shop.lat) && !isNaN(shop.lng)) {
            directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}&travelmode=driving`;
          } else {
            directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address + ', ' + shop.city)}`;
          }
          console.log(`Opening Google Maps directions: ${directionsUrl}`);
        } else {
          // Apple Maps directions
          if (shop.lat && shop.lng && !isNaN(shop.lat) && !isNaN(shop.lng)) {
            directionsUrl = `maps://?daddr=${shop.lat},${shop.lng}&dirflg=d`;
          } else {
            directionsUrl = `maps://?q=${encodeURIComponent(shop.address + ', ' + shop.city)}`;
          }
          console.log(`Opening Apple Maps directions: ${directionsUrl}`);
        }

        window.location.href = directionsUrl;
      } catch (error) {
        console.error(`Error opening ${useGoogleMaps ? 'Google' : 'Apple'} Maps directions:`, error);
        if (!useGoogleMaps) {
          // Fallback to Google Maps web for Apple Maps errors
          const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address + ', ' + shop.city)}`;
          console.log(`Falling back to Google Maps: ${fallbackUrl}`);
          window.location.href = fallbackUrl;
        } else {
          alert('Failed to open directions. Please try again.');
        }
      }
    });
  });

  document.getElementById('share-button')?.addEventListener('click', async function(e) {
    e.stopPropagation();
    try {
      // Create a shareable Google Maps URL
      let shareUrl;
      if (shop.lat && shop.lng && !isNaN(shop.lat) && !isNaN(shop.lng)) {
        shareUrl = `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`;
      } else {
        shareUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address + ', ' + shop.city)}`;
      }

      // Share data
      const shareData = {
        title: `Check out ${shop.name}`,
        text: `Visit ${shop.name} at ${shop.address}, ${shop.city}! ${averageRating > 0 ? `Rated ${averageRating}/10.` : ''}`,
        url: shareUrl,
      };

      // Try Web Share API
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log(`Shared ${shop.name} successfully`);
      } else {
        // Fallback to copying URL to clipboard
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        alert('Shop details copied to clipboard!');
        console.log(`Copied ${shop.name} details to clipboard`);
      }
    } catch (error) {
      console.error(`Error sharing ${shop.name}:`, error);
      alert('Failed to share. Please try again.');
    }
  });

  document.getElementById('favorite-button')?.addEventListener('click', async function(e) {
    e.stopPropagation();
    if (!shop) return;
    shop.id = shopId; // Ensure shop has the correct shop_id
    await addToFavorites(shop);
  });

  // Card click to show details
  floatingCard.addEventListener('click', function(e) {
    if (
      e.target.closest('.floating-card-close-button') ||
      e.target.closest('#call-button') ||
      e.target.closest('#directions-button') ||
      e.target.closest('#share-button') ||
      e.target.closest('#favorite-button')
    ) return;
    if (shop) {
      showShopDetails(shop);
      floatingCard.classList.add('hidden');
      console.log('Shop details displayed, floating card hidden');
    }
  });
}
  async function showShopDetails(shop) {
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
    const { data: shopReviews, error } = await client
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
              <p>${review.parking ? 'Parking Available ' : ''}${review.pet_friendly ? 'Pet Friendly ' : ''}${review.outside_seating ? 'Outside Seating' : ''}</p>
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
    <h3 class="shop-details-heading"> ${shop.name}</h3>
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

  async function showReviewBanner(shop) {
  console.log('showReviewBanner for:', shop.name, 'Shop object:', shop);
  if (!shop || !shop.name || !shop.address || !shop.city) {
    console.warn('Invalid shop data:', shop);
    document.getElementById('review-banner')?.classList.add('hidden');
    return;
  }

  if (!client || !client.auth) {
    console.error('Supabase client is not initialized');
    alert('Error: Database connection not available.');
    return;
  }

  const { data: { user }, error: userError } = await client.auth.getUser();
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
    const { data, error } = await client
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

async function showAuthBanner(shop, onSuccessCallback = null) {
  const authBanner = document.getElementById('auth-banner');
  if (!authBanner) {
    console.error('Auth banner element not found');
    return;
  }

  // Check if supabase client is available
  if (!supabase || !supabase.auth) {
    console.error('Supabase client is not initialized or auth is unavailable');
    alert('Error: Database connection not available. Please try again later.');
    return;
  }

  let isSignUp = false; // Toggle between sign-in and sign-up modes

  authBanner.innerHTML = `
    <button class="auth-banner-close-button" aria-label="Close auth form">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <h3 id="auth-heading" class="auth-banner-heading">${shop ? `Sign In to Leave a Review for ${shop.name}` : 'Sign In to Use the App'}</h3>
    <input id="auth-email" type="email" class="auth-banner-input" placeholder="Email" required>
    <input id="auth-password" type="password" class="auth-banner-input" placeholder="Password" required>
    <div class="auth-banner-actions">
      <button id="auth-toggle-button" class="auth-banner-toggle-button">Need an account? Sign Up</button>
      <button id="auth-submit-button" class="auth-banner-submit-button">Sign In</button>
    </div>
  `;
  authBanner.classList.remove('hidden');
  console.log('Auth banner classes after show:', authBanner.classList.toString());

  // Prevent clicks inside auth banner from closing it
  authBanner.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close button
  authBanner.querySelector('.auth-banner-close-button')?.addEventListener('click', (e) => {
    e.stopPropagation();
    authBanner.classList.add('hidden');
    console.log('Auth banner closed');
  });

  // Toggle between sign-in and sign-up
  const toggleButton = authBanner.querySelector('#auth-toggle-button');
  const authHeading = authBanner.querySelector('#auth-heading');
  const submitButton = authBanner.querySelector('#auth-submit-button');
  toggleButton?.addEventListener('click', (e) => {
    e.stopPropagation();
    isSignUp = !isSignUp;
    authHeading.textContent = isSignUp ? (shop ? `Sign Up to Leave a Review for ${shop.name}` : 'Sign Up to Use the App') : (shop ? `Sign In to Leave a Review for ${shop.name}` : 'Sign In to Use the App');
    submitButton.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    toggleButton.textContent = isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
    console.log('Toggled to:', isSignUp ? 'Sign Up' : 'Sign In');
  });

  // Submit button
  submitButton?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const email = authBanner.querySelector('#auth-email').value.trim();
    const password = authBanner.querySelector('#auth-password').value.trim();

    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }

    let authError = null;
    if (isSignUp) {
      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      authError = error;
      if (!error) {
        console.log('User signed up:', data.user);
        alert('Sign-up successful! Please check your email to confirm your account.');
      }
    } else {
      // Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authError = error;
      if (!error) {
        console.log('User signed in:', data.user);
      }
    }

    if (authError) {
      console.error('Authentication error:', authError.message);
      alert(`Authentication failed: ${authError.message}`);
      return;
    }

    // Close auth banner
    authBanner.classList.add('hidden');
    // Call callback or show review banner
    if (onSuccessCallback) {
      onSuccessCallback();
    } else if (shop) {
      showReviewBanner(shop);
    }
  });
}

    const filtersButton = document.querySelector('.filters-button');
    if (filtersButton) {
      filtersButton.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('Filters button clicked');
        const filtersModal = document.getElementById('filters-modal');
        if (filtersModal) {
          document.querySelectorAll('#cities-modal, #top100-modal, #favorite-modal').forEach(m => m.classList.add('hidden'));
          filtersModal.classList.remove('hidden');
          console.log('Filters modal state:', filtersModal.classList.contains('hidden') ? 'hidden' : 'visible');
        } else {
          console.error('Filters modal not found in DOM');
        }
      });
    } else {
      console.error('Filters button not found in DOM');
    }

    window.applyFilters = function() {
      const parkingCheckbox = document.getElementById('filter-parking');
      const petFriendlyCheckbox = document.getElementById('filter-pet-friendly');
      const specialtyCoffeeCheckbox = document.getElementById('filter-specialty-coffee');

      filterState.parking = parkingCheckbox ? parkingCheckbox.checked : false;
      filterState.petFriendly = petFriendlyCheckbox ? petFriendlyCheckbox.checked : false;
      filterState.specialtyCoffee = specialtyCoffeeCheckbox ? specialtyCoffeeCheckbox.checked : false;

      console.log('Applying filters:', filterState);
      fetchFilteredShops();
      document.getElementById('filters-modal').classList.add('hidden');
    };

    function fetchFilteredShops() {
      if (!placesService) {
        console.error('PlacesService not initialized');
        return;
      }

      const location = userLocation || map.getCenter();
      const latLng = new google.maps.LatLng(location.lat, location.lng);

      let query = 'coffee shop';
      if (filterState.parking) query += ' parking';
      if (filterState.petFriendly) query += ' pet friendly';
      if (filterState.specialtyCoffee) query += ' specialty coffee';

      const request = {
        query: query,
        location: latLng,
        radius: 5000,
        type: 'cafe'
      };

      console.log('Fetching shops with request:', request);
      placesService.textSearch(request, (results, status) => {
        console.log('Text search status:', status);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          console.log('Filtered shops:', results);
          results.forEach(result => {
            const existingShop = shops.find(shop => shop.placeId === result.place_id);
            if (!existingShop) {
              const shopReviews = reviews.filter(r => r.shopName === result.name);
              shops.push({
                placeId: result.place_id,
                name: result.name || 'Unknown Shop',
                city: extractCityFromAddressComponents(result.address_components),
                petFriendly: shopReviews.some(r => r.petFriendly) || false,
                parking: shopReviews.some(r => r.parking) || false,
                outsideSeating: shopReviews.some(r => r.outsideSeating) || false,
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
                address: result.formatted_address || 'No address available',
                website: result.website || 'No website available',
                phone: result.formatted_phone_number || 'No phone number available'
              });
            }
          });
          displayFilteredShops(results);
        } else {
          console.error('Failed to fetch filtered shops:', status);
          document.getElementById('filtered-shops-list').innerHTML = '<p>No shops found.</p>';
        }
      });
    }

    function displayFilteredShops(shops) {
    const filteredShopsList = document.getElementById('filtered-shops-list');
    if (!filteredShopsList) {
      console.error('Filtered shops list element not found in DOM');
      return;
    }

    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];

    filteredShopsList.innerHTML = '';

    if (shops.length === 0) {
      filteredShopsList.innerHTML = '<p>No shops match your filters.</p>';
      return;
    }

    shops.forEach(shop => {
      const listItem = document.createElement('div');
      listItem.className = 'p-2 hover:bg-gray-100 cursor-pointer';
      listItem.innerHTML = `
        <h3 class="font-bold">${shop.name || 'Unknown Shop'}</h3>
        <p class="text-sm text-gray-500">${shop.formatted_address || 'No address'}</p>
        <p class="text-sm text-gray-500">Rating: ${shop.rating || 'N/A'}</p>
      `;
      listItem.addEventListener('click', () => {
        console.log('Filtered shop clicked:', shop.name);
        const lat = shop.geometry.location.lat();
        const lng = shop.geometry.location.lng();
        map.setView([lat, lng], 15);
        // Use coffeeIcon for filtered shop marker
        const marker = L.marker([lat, lng], { icon: coffeeIcon })
          .addTo(map)
          .bindPopup(shop.name)
          .openPopup();
        currentMarkers.push(marker);

        currentShop = {
          name: shop.name || 'Unknown Shop',
          rating: shop.rating ? shop.rating + ' / 5' : 'N/A',
          address: shop.formatted_address || 'No address available',
          website: shop.website || 'No website available',
          phone: shop.formatted_phone_number || 'No phone number available',
          features: {
            parking: reviews.some(r => r.parking && r.shopName === shop.name) || false,
            petFriendly: reviews.some(r => r.petFriendly && r.shopName === shop.name) || false,
            specialtyCoffee: reviews.some(r => r.specialtyCoffee && r.shopName === shop.name) || false
          },
          lat: lat,
          lng: lng,
          city: extractCityFromAddressComponents(shop.address_components)
        };
        console.log('currentShop set from filtered shop:', currentShop);
        showFloatingCard(currentShop);
      });
      filteredShopsList.appendChild(listItem);
    });
  }

  let selectedRatingFilter = 'all';

  const ratingButtons = document.querySelectorAll('#cities-modal button[id*="rating"]');
  ratingButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      selectedRatingFilter = button.textContent.toLowerCase().replace('+', '');
      console.log('Rating filter selected:', selectedRatingFilter);
      ratingButtons.forEach(btn => btn.classList.remove('bg-blue-500', 'text-white'));
      button.classList.add('bg-blue-500', 'text-white');
      const activeCity = document.querySelector('#cities-modal .city-button')?.textContent.toLowerCase().trim() || 'paris';
      fetchShopsByCity(activeCity, selectedRatingFilter);
    });
  });

  function fetchShopsByCity(city, ratingFilter) {
    if (!placesService) {
      console.error('PlacesService not initialized');
      return;
    }

    const [lat, lng] = cityCoordinates[city] || [48.8566, 2.3522];
    const latLng = new google.maps.LatLng(lat, lng);

    const request = {
      query: 'coffee shop',
      location: latLng,
      radius: 5000,
      type: 'cafe'
    };

    console.log('Fetching shops for city:', city, 'with request:', request);
    placesService.textSearch(request, (results, status) => {
      console.log('Text search status for city:', status);
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        let filteredResults = results;
        if (ratingFilter !== 'all') {
          const minRating = parseFloat(ratingFilter);
          filteredResults = results.filter(shop => shop.rating >= minRating);
        }

        console.log(`Filtered shops for ${city} (rating ${ratingFilter}+):`, filteredResults);
        shops = filteredResults.map(result => ({
          placeId: result.place_id,
          name: result.name || 'Unknown Shop',
          city: extractCityFromAddressComponents(result.address_components),
          petFriendly: reviews.some(r => r.petFriendly && r.shopName === result.name) || false,
          parking: reviews.some(r => r.parking && r.shopName === result.name) || false,
          outsideSeating: reviews.some(r => r.outsideSeating && r.shopName === result.name) || false,
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          address: result.formatted_address || 'No address available',
          website: result.website || 'No website available',
          phone: result.formatted_phone_number || 'No phone number available',
          rating: result.rating || 0
        }));

        // Clear existing markers
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];

        // Add markers for each shop using coffeeIcon
        shops.forEach(shop => {
          const marker = L.marker([shop.lat, shop.lng], { icon: coffeeIcon })
            .addTo(map)
            .bindPopup(shop.name);
          marker.on('click', () => {
            console.log('Marker clicked for:', shop.name);
            currentShop = shop;
            showFloatingCard(shop);
          });
          currentMarkers.push(marker);
        });

        displayFilteredShops(filteredResults);
      } else {
        console.error('Failed to fetch shops for city:', status);
        document.getElementById('filtered-shops-list').innerHTML = '<p>No shops found.</p>';
      }
    });
  }

   async function displayTop100Shops() {
  console.log('Displaying top 100 shops');
  const top100List = document.getElementById('top100-list');
  if (!top100List) {
    console.error('Top 100 list element not found');
    return;
  }

  top100List.innerHTML = '<p class="top100-modal-loading">Loading top shops...</p>';

  try {
    // Query Supabase for top 100 shops by average rating
    const { data: topShops, error } = await client
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
      .returns([
        {
          id: 'uuid',
          name: 'string',
          address: 'string',
          city: 'string',
          lat: 'number',
          lng: 'number',
          reviews: [{ rating: 'number' }],
        },
      ])
      .limit(100);

    if (error) {
      console.error('Error fetching top shops:', error);
      top100List.innerHTML = '<p class="top100-modal-loading">Error loading top shops.</p>';
      return;
    }

    // Process shops to calculate average ratings
    const processedShops = topShops
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
      .filter(shop => shop.reviewCount > 0) // Only include shops with reviews
      .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount) // Sort by rating, then review count
      .slice(0, 100); // Limit to top 100

    if (processedShops.length === 0) {
      top100List.innerHTML = '<p class="top100-modal-loading">No rated shops available.</p>';
      console.log('No top shops to display');
      return;
    }

    top100List.className = 'top100-modal-list';
    top100List.innerHTML = '';

    processedShops.forEach(shop => {
      const isFavorited = favorites.some(fav => fav.name === shop.name && fav.address === shop.address);
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

    // Remove any existing listeners to avoid duplicates
    top100List.removeEventListener('click', handleTop100ButtonClick);

    // Add a single delegated event listener to top100List
    top100List.addEventListener('click', handleTop100ButtonClick);
    console.log('Attached delegated click listener to top100List');
  } catch (error) {
    console.error('Error in displayTop100Shops:', error);
    top100List.innerHTML = '<p class="top100-modal-loading">Error loading top shops.</p>';
  }
}

// Updated delegated event handler for view and favorite buttons
function handleTop100ButtonClick(e) {
  const target = e.target.closest('.top100-modal-button');
  if (!target) return;

  e.stopPropagation();
  const shopId = target.dataset.shopId;
  const shop = topShops.find(s => s.id === shopId); // Use topShops instead of global shops

  if (!shop) {
    console.error('Shop not found for ID:', shopId);
    return;
  }

  if (target.classList.contains('view-shop')) {
    console.log('Viewing shop from Top 100:', shop.name);
    currentShop = shop;
    try {
      showShopDetails(shop);
      console.log('Shop details banner shown for:', shop.name);
      document.getElementById('top100-modal').classList.add('hidden');
      console.log('Top 100 modal hidden');
    } catch (error) {
      console.error('Error showing shop details:', error);
    }
  } else if (target.classList.contains('favorite-shop')) {
    const isCurrentlyFavorited = favorites.some(fav => fav.name === shop.name && fav.address === shop.address);
    if (isCurrentlyFavorited) {
      favorites = favorites.filter(fav => fav.name !== shop.name || fav.address !== shop.address);
      target.classList.remove('favorited');
      target.querySelector('svg').setAttribute('fill', 'none');
      target.setAttribute('aria-label', `Add ${shop.name} to favorites`);
      console.log('Removed from favorites:', shop.name);
    } else {
      addToFavorites(shop);
      target.classList.add('favorited');
      target.querySelector('svg').setAttribute('fill', 'currentColor');
      target.setAttribute('aria-label', `Remove ${shop.name} from favorites`);
      console.log('Added to favorites:', shop.name);
    }
    updateFavoritesModal();
  }
}

// Ensure displayTop100Shops is called when the modal is opened
document.getElementById('top-100-button').addEventListener('click', () => {
  document.getElementById('top100-modal').classList.remove('hidden');
  displayTop100Shops(); // Re-render and reattach listeners
});

    function updateTop100Display(topShops, filterState) {
      const shopListContainer = document.getElementById('top100-shop-list');
      if (!shopListContainer) {
        console.error('Top 100 shop list container not found');
        return;
      }

      let filteredShops = [...topShops];
      if (filterState.parking || filterState.outsideSeating || filterState.petFriendly) {
        filteredShops = topShops.filter(shop => {
          return (!filterState.parking || shop.parking) &&
                 (!filterState.outsideSeating || shop.outsideSeating) &&
                 (!filterState.petFriendly || shop.petFriendly);
        });
      }

      shopListContainer.innerHTML = filteredShops.length > 0
        ? filteredShops.map((shop, index) => `
            <div class="p-2 hover:bg-gray-100 cursor-pointer top100-shop" data-name="${shop.name}">
              <span>${index + 1}. ${shop.name}</span>
              <span>Rating: ${shop.avgRating.toFixed(1)}/10</span>
              <span>${shop.parking ? 'Parking ' : ''}${shop.outsideSeating ? 'Outdoor ' : ''}${shop.petFriendly ? 'Pet ' : ''}</span>
            </div>
          `).join('')
        : '<p>No shops match the selected filters.</p>';

      document.querySelectorAll('.top100-shop').forEach(item => {
        item.addEventListener('click', () => {
          const shopName = item.getAttribute('data-name');
          const shop = shops.find(s => s.name === shopName) || { name: shopName, rating: `${topShops.find(s => s.name === shopName).avgRating}/10` };
          console.log('Top 100 shop clicked:', shopName);
          currentShop = shop;
          showFloatingCard(shop);
        });
      });
    }

  } catch (error) {
    console.error('Error initializing map:', error);
    document.getElementById('map')?.classList.add('map-failed');
  }
}, false);

document.addEventListener('DOMContentLoaded', async () => {
  const authBanner = document.getElementById('auth-banner');
  const closeBtn = document.getElementById('auth-banner-close-button');
  const submitBtn = document.getElementById('auth-submit');
  const toggleBtn = document.getElementById('auth-toggle');
  const resetBtn = document.getElementById('auth-reset');

  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');

  let isLoginMode = true;

  // Auto-hide banner if user is already logged in
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    authBanner.classList.add('hidden');
  } else {
    authBanner.classList.remove('hidden');
  }

  // Close banner
  closeBtn?.addEventListener('click', () => {
    authBanner.classList.add('hidden');
  });

  // Login or Sign Up
  submitBtn?.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    try {
      const { error } = isLoginMode
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password });

      if (error) throw error;

      alert(isLoginMode ? "Login successful!" : "Signup successful!");
      authBanner.classList.add('hidden');
    } catch (err) {
      alert(err.message || "Authentication failed.");
    }
  });

  // Toggle Login / Sign Up
  toggleBtn?.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    submitBtn.textContent = isLoginMode ? "Login" : "Sign Up";
    toggleBtn.textContent = isLoginMode ? "Sign Up" : "Already have an account?";
    resetBtn.style.display = isLoginMode ? "inline-block" : "none"; // Hide reset for signup
  });

  // Password Reset
  resetBtn?.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
      alert("Please enter your email to reset password.");
      return;
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href // Can be a custom URL
      });
      if (error) throw error;
      alert("Password reset link sent!");
    } catch (err) {
      alert(err.message || "Failed to send reset email.");
    }
  });

  // Listen for auth state changes
  client.auth.onAuthStateChange((event, session) => {
    if (session) {
      authBanner.classList.add('hidden');
    }
  });
});
