import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export async function AuthBanner(shop, onSuccessCallback = null) {
  // ... (rest of the AuthBanner function remains the same)
}

export function showModal(modalId) {
  // code to show a modal...
}

export function hideModal(modalId) {
  // code to hide a modal...
}

export function showToast(message, type = 'info', duration = 6000) {
  // Check if a container exists, if not create one
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  // Apply base + type classes
  toast.className = `toast ${type}`;
  toast.textContent = message;

  // Force reflow so animation restarts if called multiple times
  void toast.offsetWidth;

  // Show it
  toast.classList.add('show');

  // Auto-hide after duration
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

export function showLoadingIndicator() {
  // code to show a loading indicator...
}

export function hideLoadingIndicator() {
  // code to hide a loading indicator...
}

export async function showAuthBanner(shop, onSuccessCallback = null) {
  await AuthBanner(shop, onSuccessCallback);
}
