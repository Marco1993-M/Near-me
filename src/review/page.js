import { useEffect } from 'react';
import supabase from '../../src/supabase';
import { showReviewBanner } from '../../src/reviewBanner';

export default function ReviewPage({ shop }) {
  useEffect(() => {
    if (shop) showReviewBanner(shop); // Opens the banner automatically
  }, [shop]);

  return <div id="review-banner" className="hidden"></div>;
}

// Fetch shop on the server
export async function getServerSideProps({ params }) {
  const { slug } = params;

  const { data: shop, error } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !shop) return { notFound: true };

  return { props: { shop } };
}
