import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

let isSignUp = true;

async function initAuth() {
  console.log('initAuth called');

  const banner = document.getElementById('auth-banner');
  console.log('Banner element:', banner);

  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');

  const submitBtn = document.getElementById('auth-toggle-button');
  const toggleText = document.getElementById('auth-login-toggle');
  const googleSignInBtn = document.getElementById('google-signin-button');

  if (!submitBtn || !emailInput || !passwordInput || !banner) {
    console.warn('Auth elements not found in DOM. Skipping initAuth.');
    return;
  }

  // This function will update the banner visibility based on login state
  const updateAuthBanner = async () => {
    console.log('updateAuthBanner called');
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    console.log('Session:', session);

    if (!session) {
      banner.classList.remove('hidden');
      console.log('Banner should be visible');
    } else {
      banner.classList.add('hidden');
      console.log('Banner should be hidden');
    }
  };

  // Listen for auth state changes to hide banner once logged in
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      banner.classList.add('hidden');
    }
  });

  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert('Signup failed: ' + error.message);
      else alert('Check your email to confirm.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('Login failed: ' + error.message);
      else {
        // Hide banner on successful login
        banner.classList.add('hidden');
      }
    }
  });

  toggleText.addEventListener('click', () => {
    isSignUp = !isSignUp;
    if (isSignUp) {
      submitBtn.textContent = 'Sign Up';
      toggleText.textContent = 'Already have an account? Log In';
      document.querySelector('.auth-banner-heading').textContent = 'Create your account';
    } else {
      submitBtn.textContent = 'Log In';
      toggleText.textContent = 'Don\'t have an account? Sign Up';
      document.querySelector('.auth-banner-heading').textContent = 'Log in to your account';
    }
  });

  googleSignInBtn?.addEventListener('click', async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) alert('Google Sign-in failed: ' + error.message);
  });
}

// IMPORTANT: Do NOT call updateAuthBanner on page load here.
// Instead expose this function globally to trigger the banner only when needed:
window.showAuthBannerIfNotLoggedIn = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    const banner = document.getElementById('auth-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
    return false; // user not logged in
  }
  return true; // user logged in
};

initAuth();
