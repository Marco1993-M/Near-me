import { createClient } from '@supabase/supabase-js';
import { initMap } from './map.js';
import './auth.js';
import { initModals } from './modals.js';
import { loadShops } from './shops.js';
import { initFavorites } from './favorites.js';
import { initReviews } from './reviews.js';
import { initSearch } from './search.js';
import { initTasteProfile } from './quiz.js';
import { checkNearbyShops } from './shopPopUp.js';

const supabaseUrl = 'https://mqfknhzpjzfhuxusnasl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpZmY0V3dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.m2g3hmoHttl9baVt3VW4tTMt3jQc_toN5iwuYbZfisg2m';

const supabase = createClient(supabaseUrl, supabaseKey);

window.initGoogleMaps = function () {
  initSearch(supabase); // Pass supabase for shop details
};

window.addEventListener('DOMContentLoaded', async () => {
  initMap();
  initModals(supabase);
  await loadShops(); // await in case it’s async
  initFavorites();
  initReviews();
  initTasteProfile();
  checkNearbyShops(supabase);
});
