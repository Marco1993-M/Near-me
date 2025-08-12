import { createClient } from '@supabase/supabase-js';
import { initMap } from './map.js';
import './auth.js';
import { initModals } from './modals.js';
import { loadShops } from './shops.js';
import { initFavorites } from './favorites.js';
import { initReviews } from './reviews.js';
import { initSearch } from './search.js';
import { initTasteProfile } from './quiz.js';

const supabaseUrl = 'https://mqfknhzpjzfhuxusnasl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpZmY0V3dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.m2g3hmoHttl9baVt3VW4tTMt3jQc_toN5iwuYbZfisg2m';

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to load Google Maps API dynamically and then call initSearch
function loadGoogleMapsApi() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      // Already loaded
      resolve();
      return;
    }

    window.initGoogleMaps = () => {
      initSearch(supabase); // your original callback logic
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB6PCrEeC-cr9YRt_DX-iil3MbLX845_ps&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  initMap();
  initModals(supabase);
  await loadShops(); // await in case it’s async
  initFavorites();
  initReviews();
  initTasteProfile();

  // Dynamically load Google Maps API and init search
  try {
    await loadGoogleMapsApi();
  } catch (err) {
    console.error('Google Maps API failed to load', err);
  }
});
