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

const toastMessages = {
  favorites: [
    "You’re not alone – 200+ others love this café too ☕️",
    "Nice choice 👌 Added to your favorites.",
    "Trending pick! 🔥 Just saved for you.",
    "Favorited 💛 Ready to plan your coffee crawl?",
    "Saved ✅ – check your favorites anytime."
  ],
  reviews: [
    "Your voice matters 📝 Thanks for sharing!",
    "Review posted 🌟 You’re helping others discover great coffee.",
    "Cheers ☕ Your feedback makes cafés better.",
    "Nice one! 👏 Review submitted successfully."
  ],
  explore: [
    "Searching nearby... 🔍 hidden gems await!",
    "Adventure time 🚶 Discover cafés around you.",
    "Explore mode on ✨ Let’s find your next favorite spot.",
    "Ready for a coffee crawl? 🗺️"
  ],
  success: [
    "Done ✅ That worked perfectly!",
    "All good 👍 Task completed.",
    "Smooth as espresso ☕ Success!"
  ],
  error: [
    "Oops 😅 Something went wrong.",
    "Error 🚨 Please try again.",
    "We spilled the coffee... ☕ Retry?",
    "Hmm 🤔 that didn’t work."
  ],
  info: [
    "Heads up 💡",
    "FYI 📢",
    "Did you know? 🤓"
  ],
  pageLoad: [
    "Welcome! 👋 Discover cafés nearby or check your favorites.",
    "Hey there ☕ Ready to explore some amazing coffee?",
    "Let’s find your next favorite spot! 🔎",
    "Good to see you! 🌟 Start searching or leave a review."
  ]
};

export function showToast({ message = null, category = "info", type = "info", duration = 3000 } = {}) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  const pool = toastMessages[category] || toastMessages.info;
  const finalMessage = message || pool[Math.floor(Math.random() * pool.length)];

  toast.className = `show ${type}`;
  toast.textContent = finalMessage;

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.className = toast.className.replace("show", "");
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
