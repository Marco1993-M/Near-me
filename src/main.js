import { initMap } from './map.js';
import './auth.js';
import { initModals } from './modals.js';
import { loadShops } from './shops.js';
import { initFavorites } from './favorites.js';
import { initReviews } from './reviews.js';
import { initSearch } from './search.js';

const supabaseUrl = 'https://mqfknhzpjzfhuxusnasl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpZmY0V3dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.m2g3hmoHttl9baVt3VW4tTMt3jQc_toN5iwuYbZfisg2m';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Trigger search initSearch after Google Maps API loads
window.initGoogleMaps = function () {
  initSearch(supabase); // Pass supabase for shop details
};

window.addEventListener('DOMContentLoaded', async () => {
  initMap();
  initModals(supabase);
  loadShops();
  initFavorites();
  initReviews();
});
