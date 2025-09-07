import supabase from './supabase.js';
import { loadFavorites, addToFavorites, removeFromFavorites, updateFavoritesModal } from './favorites.js';
import { showShopDetails } from './shopdetails.js';
import { getOrCreateShop } from './db.js';

let favorites = [];
let currentShop = null;
let processedShops = []; // This will hold the filtered and sorted top 100 shops data

async function init() {
    try {
        favorites = await loadFavorites();
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Initialize favorites when the script loads
init();

/**
 * Converts a 2-letter country code to its corresponding flag emoji.
 * @param {string} code - The two-letter country code (e.g., "US", "GB").
 * @returns {string} The flag emoji or a generic earth emoji if invalid.
 */
function countryCodeToFlagEmoji(code) {
    if (!code || typeof code !== 'string' || code.length !== 2) return '🌍';
    return code
        .toUpperCase()
        .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
}

/**
 * Fetches and displays the top 100 coffee shops based on ratings and review count.
 * This function should be called whenever the top 100 modal needs to be populated/refreshed.
 */
export async function displayTop100Shops() {
    const top100Container = document.getElementById('top100-list');
    if (!top100Container) return console.error('Top 100 container not found');

    // Show loading
    top100Container.innerHTML = '<p class="top100-modal-loading">Loading shops...</p>';
    top100Container.className = 'top100-bento-grid';

    try {
        const { data: allShops, error } = await supabase
            .from('shops')
            .select(`
                id,
                name,
                address,
                city,
                country_code,
                lat,
                lng,
                photos,
                reviews (rating)
            `)
            .limit(600); // Fetch all shops (up to 600)

        if (error) throw error;

        // Process shops: calculate average ratings
        processedShops = allShops
            .map(shop => {
                const reviews = shop.reviews || [];
                const avgRating = reviews.length
                    ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
                    : 0;
                return {
                    ...shop,
                    averageRating: avgRating,
                    reviewCount: reviews.length
                };
            })
            // No filter — keep shops with 0 reviews
            .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount);

        if (!processedShops.length) {
            top100Container.innerHTML = '<p class="top100-modal-loading">No shops available.</p>';
            return;
        }

        top100Container.innerHTML = '';

      // Helper: get shop photo
const getShopPhoto = (shop) => {
    if (shop.photos && shop.photos.length > 0) {
        return shop.photos[Math.floor(Math.random() * shop.photos.length)];
    }
    // Use app logo as placeholder
    return '/logo.png'; // <-- replace with your logo path
};

        processedShops.forEach((shop, index) => {
            const isFavorited = favorites.some(fav => String(fav.shop_id) === String(shop.id));

            // Assign random bento size class
            let sizeClass = '';
            if (index % 11 === 0) sizeClass = 'big';
            else if (index % 7 === 0) sizeClass = 'wide';
            else if (index % 5 === 0) sizeClass = 'tall';

            const photoUrl = getShopPhoto(shop, index);

            const card = document.createElement('div');
            card.className = `top100-card ${sizeClass}`;
            card.innerHTML = `
                <img src="${photoUrl}" alt="${shop.name}" loading="lazy">
                <div class="top100-card-info">
                    <div>⭐ ${shop.reviewCount ? shop.averageRating.toFixed(1) : 'No ratings yet'} – ${shop.name}</div>
                    <div style="font-size:0.75rem;">${shop.city}</div>
                </div>
                <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-shop-id="${shop.id}" aria-label="${isFavorited ? `Remove ${shop.name} from favorites` : `Add ${shop.name} to favorites`}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        ${isFavorited 
                            ? '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>' 
                            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>'}
                    </svg>
                </button>
            `;

            // Click to show shop details (excluding favorite button)
            card.addEventListener('click', (e) => {
                if (e.target.closest('.favorite-btn')) return;
                currentShop = { ...shop };
                showShopDetails(currentShop);
                document.getElementById('top100')?.close();
            });

            top100Container.appendChild(card);
        });

    } catch (err) {
        console.error('Error loading shops:', err);
        top100Container.innerHTML = '<p class="top100-modal-loading">Error loading shops.</p>';
    }
}


// Handle favorite button clicks via delegation
document.addEventListener('DOMContentLoaded', () => {
    const top100Container = document.getElementById('top100-list');
    if (!top100Container) return;
    top100Container.addEventListener('click', async (e) => {
        const btn = e.target.closest('.favorite-btn');
        if (!btn) return;
        e.stopPropagation();

        const shopId = btn.dataset.shopId;
        if (!shopId) return;

        const shopInfo = processedShops.find(s => String(s.id) === String(shopId));
        if (!shopInfo) return;

        const svg = btn.querySelector('svg');
        const isAlreadyFavorited = favorites.some(fav => String(fav.shop_id) === String(shopInfo.id));

        try {
            const resolvedShopId = await getOrCreateShop(
                shopInfo.name,
                shopInfo.address,
                shopInfo.city,
                shopInfo.lat,
                shopInfo.lng,
                shopInfo.country_code
            );

            if (isAlreadyFavorited) {
                await removeFromFavorites(shopInfo);
                favorites = favorites.filter(f => String(f.shop_id) !== String(resolvedShopId));
                btn.classList.remove('favorited');
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>';
                btn.setAttribute('aria-label', `Add ${shopInfo.name} to favorites`);
            } else {
                await addToFavorites(shopInfo);
                favorites.push({ shop_id: resolvedShopId, name: shopInfo.name });
                btn.classList.add('favorited');
                svg.innerHTML = '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
                btn.setAttribute('aria-label', `Remove ${shopInfo.name} from favorites`);
            }

            updateFavoritesModal();
        } catch (err) {
            console.error('Error toggling favorite:', err);
        }
    });
});



// Get references to the modal elements and buttons
const top100Modal = document.getElementById('top100');
const openTop100Btn = document.getElementById('top-100-button');
const closeTop100Btn = document.querySelector('.top100-modal-close-button');

// Add event listener for opening the Top 100 Shops modal
openTop100Btn?.addEventListener('click', () => {
    if (top100Modal) { // Ensure modal exists
        if (!top100Modal.open) { // Check if it's not already open
            top100Modal.showModal(); // Display the modal
        }
        displayTop100Shops(); // Refresh/populate the list every time it's opened
    } else {
        console.error("Top 100 modal element not found.");
    }
});

// Add event listener for closing the Top 100 Shops modal
closeTop100Btn?.addEventListener('click', () => {
    top100Modal?.close();
});


// IMPORTANT: Attach the delegated click listener for favorite buttons ONCE
// when the DOM is fully loaded. This ensures it persists regardless of
// content changes within top100-list.
document.addEventListener('DOMContentLoaded', () => {
    const top100List = document.getElementById('top100-list');
    if (top100List) {
        top100List.addEventListener('click', handleTop100ButtonClick);
        console.log("Favorite button click listener attached to #top100-list.");
    } else {
        console.warn("top100-list element not found on DOMContentLoaded. Favorite button clicks for top 100 shops might not work correctly.");
    }
});
