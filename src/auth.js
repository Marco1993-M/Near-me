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


  await updateAuthBanner();

  supabase.auth.onAuthStateChange(async (event, session) => {
    await updateAuthBanner();
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

initAuth();