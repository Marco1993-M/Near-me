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
    "These are the good old coffee days. ❤️",
    "I declare… COFFEE! ☕️",
    "You miss 100% of the shots you don’t take. – Wayne Gretzky – Michael Scott 🏀"
  ],
  search: [
    "Nice choice 👌",
    "Hot pick! 🔥",
    "Looking good 😍 Check out what’s nearby too.",
    "Found it! 🗺️ Your coffee destiny awaits.",
    "Michael Scott: ‘I’m ready to get hurt again.’ … by falling for another café. ❤️",
    "Assistant to the Regional Barista. ☕️"
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
