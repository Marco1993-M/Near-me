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

// UI.js

const toastMessages = {
  favorites: [
    "You’ve got great taste 👌 That café is now in your faves.",
    "Barista approved ✅ Saved to your coffee crawl list.",
    "Trending pick! 🔥 Everyone’s buzzing about this one.",
    "Saved 💛 Good luck resisting a daily visit now.",
    "Michael Scott voice: ‘Would I rather be feared or loved?’ Easy — loved. Just like this café. 💕"
  ],
  reviews: [
    "Your voice matters 📝 Thanks for spreading the coffee gospel.",
    "Review posted 🌟 You’re officially a coffee critic!",
    "Cheers ☕ You just made cafés better for everyone.",
    "Nice one 👏 Future coffee explorers salute you.",
    "Dwight Schrute would be proud: ‘Fact. That review was legendary.’ 🧃"
  ],
  explore: [
    "Searching nearby... 🔍 Hidden gems await!",
    "Adventure time 🚶 Grab your mug, let’s explore.",
    "Explore mode on ✨ May the brews be ever in your favor.",
    "Ready for a coffee crawl? 🗺️",
    "Joey doesn’t share food... but he’d share this latte. ☕😂"
  ],
  success: [
    "Done ✅ Smooth as espresso.",
    "All good 👍 Another win for Team Coffee.",
    "Barista magic complete ✨",
    "Success! 🎉 That went down easier than your first sip.",
    "Dwight: ‘Identity theft is not a joke, Jim!’ … but success? Totally real. ✅"
  ],
  error: [
    "Oops 😅 Something went wrong.",
    "Error 🚨 Even baristas burn milk sometimes.",
    "We spilled the coffee... ☕ Retry?",
    "Hmm 🤔 That didn’t work — maybe switch to decaf?",
    "Michael Scott: ‘I am Beyoncé, always.’ But right now… you’re error Beyoncé. 🙃"
  ],
  info: [
    "Heads up 💡",
    "FYI 📢 This could change your coffee life.",
    "Did you know? 🤓 Coffee naps are scientifically legit.",
    "Pro tip 🛠️ Use favorites to plan your caffeine crawl.",
    "Barista wisdom: never trust a café without good biscotti. 😉"
  ],
  pageLoad: [
    "Welcome 👋 Ready to sniff out your next caffeine fix?",
    "Hey there ☕ The beans are hot, the map is yours.",
    "Let’s find your new favorite spot 🔎",
    "Good to see you 🌟 Coffee adventures await.",
    "Office quote break: ‘I wish there was a way to know you’re in the good old days before you’ve actually left them.’ — Andy. Guess what? These are the good old coffee days. ❤️"
  ],
  search: [
    "Nice choice 👌 That one’s worth the hype.",
    "Hot pick! 🔥 Might be your new go-to spot.",
    "Looking good 😍 Check out what’s nearby too.",
    "Found it! 🗺️ Your coffee destiny awaits.",
    "Michael Scott: ‘I’m ready to get hurt again.’ … by falling for another café. ❤️"
  ]
};


export function showToast({ message = null, category = "info", type = "info", duration = 3000 } = {}) {
  // Ensure a toast container exists
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    document.body.appendChild(container);
  }

  const pool = toastMessages[category] || toastMessages.info;
  const finalMessage = message || pool[Math.floor(Math.random() * pool.length)];

  const toast = document.createElement("div");
  toast.textContent = finalMessage;
  toast.className = `toast ${type}`;
  toast.style.background = "rgba(0,0,0,0.85)";
  toast.style.color = "white";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "14px";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(20px)";
  toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
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
