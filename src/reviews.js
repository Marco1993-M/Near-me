const supabase = window.supabase.createClient('https://mqfknhzpjzfhuxusnasl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs');

export function initReviews() {
  const submitButton = document.getElementById('review-banner-submit-button');
  const cancelButton = document.getElementById('review-banner-cancel-button');
  const banner = document.getElementById('review-banner');
  const textarea = document.querySelector('.review-banner-textarea');

  document.getElementById('leave-review-button')?.addEventListener('click', () => {
    banner.classList.remove('hidden');
  });

  cancelButton?.addEventListener('click', () => {
    banner.classList.add('hidden');
  });

  submitButton?.addEventListener('click', async () => {
    const card = document.getElementById('floating-card');
    const shopId = card?.dataset?.shopId;
    const text = textarea?.value;

    if (!shopId || !text) {
      alert('Missing input');
      return;
    }

    const { error } = await supabase.from('reviews').insert([{ shop_id: shopId, text }]);
    if (error) {
      console.error('Review error:', error.message);
      alert('Failed to post review');
    } else {
      alert('Review submitted!');
      banner.classList.add('hidden');
    }
  });
}
