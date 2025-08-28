import supabase from './supabase.js';
import { showShopDetails } from './shopdetails.js';

// --- Helper functions ---
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCurrentPositionAsync() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
    } else {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    }
  });
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const interval = 50;
    let elapsed = 0;
    const checkExist = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(checkExist);
        resolve(el);
      } else if ((elapsed += interval) >= timeout) {
        clearInterval(checkExist);
        reject(new Error(`Element ${selector} not found in DOM`));
      }
    }, interval);
  });
}

// --- Popup state ---
let isPopupOpen = false;
let lastShownShopId = null;
let lastPopupTime = 0;

// --- Main function ---
export async function checkNearbyShops() {
  try {
    const position = await getCurrentPositionAsync();
    const { latitude, longitude, accuracy } = position.coords;

    // Dynamic radius: if GPS accuracy is bad, widen search
    let searchRadius = 0.1; // 100m default
    if (accuracy > 50) searchRadius = 0.15;
    if (accuracy > 100) searchRadius = 0.2;

    // Bounding box (approx 1km = 0.009 degrees)
    const latRange = searchRadius / 111; // ~1° lat = 111km
    const lngRange = searchRadius / (111 * Math.cos(deg2rad(latitude)));

    // Fetch shops near bounding box
    const { data: shops, error } = await supabase
      .from('shops')
      .select('*')
      .gte('lat', latitude - latRange)
      .lte('lat', latitude + latRange)
      .gte('lng', longitude - lngRange)
      .lte('lng', longitude + lngRange);

    if (error || !shops || shops.length === 0) return;

    // Pick closest shop within radius
    const nearbyShop = shops
      .map(shop => {
        const shopLat = parseFloat(shop.lat);
        const shopLng = parseFloat(shop.lng);
        if (isNaN(shopLat) || isNaN(shopLng)) return null;
        const distance = getDistanceFromLatLonInKm(
          latitude,
          longitude,
          shopLat,
          shopLng
        );
        return { ...shop, distance };
      })
      .filter(s => s && s.distance <= searchRadius)
      .sort((a, b) => a.distance - b.distance)[0];

    if (!nearbyShop) return;

    // Prevent spamming popup for same shop too often
    const now = Date.now();
    if (
      isPopupOpen ||
      (nearbyShop.id === lastShownShopId && now - lastPopupTime < 5 * 60 * 1000) // 5 min cooldown
    ) {
      return;
    }

    lastShownShopId = nearbyShop.id;
    lastPopupTime = now;
    isPopupOpen = true;

    // --- Popup UI ---
    const shopPopup = await waitForElement('#shop-popup');
    const shopPopupOverlay = await waitForElement('#shop-popup-overlay');
    const shopPopupName = await waitForElement('#shop-popup-name');
    const shopPopupReview = await waitForElement('#shop-popup-review');

    shopPopupName.innerHTML = `
      <span style="color:#000000; font-weight:100">Are you at </span>
      <span style="font-weight:bold; color:#333;">${nearbyShop.name}?</span>
    `;

    shopPopup.style.display = 'block';
    setTimeout(() => {
      shopPopup.classList.add('show');
      shopPopupOverlay.style.display = 'block';
      shopPopupOverlay.classList.add('show');
    }, 10);

    // Auto-hide after 10s
    setTimeout(() => {
      shopPopup.classList.remove('show');
      shopPopupOverlay.classList.remove('show');
      setTimeout(() => {
        shopPopup.style.display = 'none';
        shopPopupOverlay.style.display = 'none';
        isPopupOpen = false;
      }, 400);
    }, 10000);

    // Review button
    shopPopupReview.onclick = () => {
      shopPopup.classList.remove('show');
      shopPopupOverlay.classList.remove('show');
      setTimeout(() => {
        shopPopup.style.display = 'none';
        shopPopupOverlay.style.display = 'none';
        isPopupOpen = false;
        showShopDetails(nearbyShop);
      }, 300);
    };
  } catch (err) {
    console.error('Error in checkNearbyShops:', err);
    if (err.message.includes('Geolocation')) {
      alert('Unable to access location. Please enable location services.');
    }
  }
}
