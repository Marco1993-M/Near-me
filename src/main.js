import { initMap } from './map.js';
import './auth.js'; // Just import auth.js to run it
import { initModals } from './modals.js';
import { loadShops } from './shops.js';
import { initFavorites } from './favorites.js';
import { initReviews } from './reviews.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

window.addEventListener('DOMContentLoaded', async () => {
  initMap();
  initModals(supabase); // Pass supabase here
  loadShops();
  initFavorites();
  initReviews();
});
