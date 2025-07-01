const supabase = window.supabase.createClient(
  'https://mqfknhzpjzfhuxusnasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs'
);


export async function initFavorites() {
  await updateFavoritesModal();
}

export async function addToFavorites(shop) {
  const { data, error } = await supabase.auth.getUser();
  const userId = data.user.id;
  console.log('User ID:', userId);

  const { error: insertError } = await supabase.from('favorites').insert([
    { 
      shop_id: shop.id,
      user_id: userId,
      address: shop.address
    }
  ]);

  if (insertError) {
    console.error('Add to favorites failed:', insertError.message);
    alert('Could not save to favorites');
  } else {
    alert(`${shop.name} added to favorites`);
  }
}

// Remove shop from favorites table
export async function removeFromFavorites(shop) {
  const { error } = await supabase.from('favorites').delete().eq('shop_id', shop.id);
  if (error) {
    console.error('Remove from favorites failed:', error.message);
    alert('Could not remove from favorites');
  } else {
    alert(`${shop.name} removed from favorites`);
  }
}

// Check if a shop is favorited
export async function isShopFavorited(shopId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('shop_id')
    .eq('shop_id', shopId)
    .maybeSingle();

  return !!data && !error;
}

// Load all favorites with shop details
export async function loadFavorites() {
  const { data: favorites, error } = await supabase
    .from('favorites')
    .select('shop_id, shop:shop_id (id, name, address, city, lat, lng)')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error loading favorites:', error.message);
    return [];
  }

  return favorites;
}

// Update favorites modal UI with current favorites
export async function updateFavoritesModal() {
  const favorites = await loadFavorites();
  const favoritesList = document.getElementById('favorites-list');
  if (!favoritesList) return;

  if (!favorites || favorites.length === 0) {
    favoritesList.innerHTML = '<p>No favorites yet.</p>';
    return;
  }

  favoritesList.innerHTML = favorites
    .map(fav => {
      const shop = fav.shop;
      return `
        <li class="favorite-item" data-shop-id="${shop.id}">
          <span><strong>${shop.name}</strong> - ${shop.city}</span>
          <button class="remove-favorite-button" aria-label="Remove ${shop.name} from favorites">Remove</button>
        </li>
      `;
    })
    .join('');

  // Attach event listeners to remove buttons
  favoritesList.querySelectorAll('.remove-favorite-button').forEach(button => {
    button.addEventListener('click', async (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const shopId = li.dataset.shopId;
      await removeFavorite(shopId);
      await updateFavoritesModal();
    });
  });
}
