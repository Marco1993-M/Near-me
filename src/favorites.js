import supabase from './supabase.js';

export async function initFavorites() {
  await updateFavoritesModal();
}

export async function addToFavorites(shop) {
  // Check user login status via supabase
  const { data, error } = await supabase.auth.getUser();
  const userId = data?.user?.id;

  if (!userId) {
    console.warn('User not authenticated');
    
    // Show login banner, only if function available
    if (window.showAuthBannerIfNotLoggedIn) {
      const loggedIn = await window.showAuthBannerIfNotLoggedIn();
      if (!loggedIn) {
        // User must log in first, stop action here
        return;
      }
    } else {
      alert('You must be signed in to add favorites');
      return;
    }
  }

  // Now add favorite since user is authenticated
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

export async function removeFromFavorites(shop) {
  const { error } = await supabase.from('favorites').delete().eq('shop_id', shop.id);
  if (error) {
    console.error('Remove from favorites failed:', error.message);
    alert('Could not remove from favorites');
  } else {
    alert(`Removed from favorites`);
  }
}

export async function isShopFavorited(shopId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('shop_id')
    .eq('shop_id', shopId)
    .maybeSingle();

  return !!data && !error;
}

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

  favoritesList.querySelectorAll('.remove-favorite-button').forEach(button => {
    button.addEventListener('click', async (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const shopId = li.dataset.shopId;
      const shop = { id: shopId };
      await removeFromFavorites(shop);
      await updateFavoritesModal();
    });
  });
}
