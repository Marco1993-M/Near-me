import supabase from './supabase.js';
import { loadFavorites, addToFavorites, removeFromFavorites, updateFavoritesModal } from './favorites.js';
import { showShopDetails } from './shopdetails.js';
import { getOrCreateShop } from './db.js';

let favorites = [];
let currentShop = null;
let processedShops = []; // filtered and sorted top 100 shops

async function init() {
    try {
        favorites = await loadFavorites();
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Initialize favorites
init();

/**
 * Converts a 2-letter country code to its corresponding flag emoji.
 */
function countryCodeToFlagEmoji(code) {
    if (!code || typeof code !== 'string' || code.length !== 2) return '🌍';
    return code
        .toUpperCase()
        .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
}

/**
 * Filter processed shops based on UI filter selections
 */
function filterTop100Shops(shops) {
    const city = document.getElementById('top100-city-filter')?.value;
    const minRating = Number(document.getElementById('top100-rating-filter')?.value || 0);

    return shops.filter(shop => {
        const matchesCity = city ? shop.city === city : true;
        const matchesRating = shop.averageRating >= minRating;
        return matchesCity && matchesRating;
    });
}

/**
 * Fetch and display Top 100 shops
 */
export async function displayTop100Shops() {
    const top100Container = document.getElementById('top100-list');
    if (!top100Container) return console.error('Top 100 container not found');

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
            .limit(600);

        if (error) throw error;

        // Populate city filter dynamically once
        const cityFilter = document.getElementById('top100-city-filter');
        if (cityFilter && cityFilter.options.length <= 1) {
            const cities = [...new Set(allShops.map(shop => shop.city).filter(Boolean))].sort();
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                cityFilter.appendChild(option);
            });
        }

        // Process shops: calculate average rating
        processedShops = allShops
            .map(shop => {
                const reviews = shop.reviews || [];
                const avgRating = reviews.length
                    ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
                    : 0;
                return { ...shop, averageRating: avgRating, reviewCount: reviews.length };
            })
            .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount);

        const filteredShops = filterTop100Shops(processedShops);

        if (!filteredShops.length) {
            top100Container.innerHTML = '<p class="top100-modal-loading">No shops match your filters.</p>';
            return;
        }

        top100Container.innerHTML = '';

        // Helper: get shop photo
        const getShopPhoto = (shop) => {
            if (shop.photos && shop.photos.length > 0) {
                return shop.photos[Math.floor(Math.random() * shop.photos.length)];
            }
            return '/logo.png'; // placeholder
        };

        filteredShops.forEach((shop, index) => {
            const isFavorited = favorites.some(fav => String(fav.shop_id) === String(shop.id));

            // Assign random bento size
            let sizeClass = '';
            if (index % 11 === 0) sizeClass = 'big';
            else if (index % 7 === 0) sizeClass = 'wide';
            else if (index % 5 === 0) sizeClass = 'tall';

            const card = document.createElement('div');
            card.className = `top100-card ${sizeClass}`;
            card.innerHTML = `
                <img src="${getShopPhoto(shop)}" alt="${shop.name}" loading="lazy">
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

            // Click to show shop details
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

// Favorite button delegation
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

    // Filter listeners
    document.getElementById('top100-city-filter')?.addEventListener('change', displayTop100Shops);
    document.getElementById('top100-rating-filter')?.addEventListener('change', displayTop100Shops);
});

// Modal open/close logic
const top100Modal = document.getElementById('top100');
document.getElementById('top-100-button')?.addEventListener('click', () => {
    if (top100Modal && !top100Modal.open) {
        top100Modal.showModal();
        displayTop100Shops();
    }
});

document.querySelector('.top100-modal-close-button')?.addEventListener('click', () => {
    top100Modal?.close();
});
