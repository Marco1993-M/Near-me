const supabase = window.supabase.createClient(
  'https://mqfknhzpjzfhuxusnasl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs'
);


export async function getOrCreateShop(name, address, city, lat, lng, supabase) {
  // Try to find the shop first
  const { data, error } = await supabase
    .from('shops')
    .select('id')
    .eq('name', name)
    .eq('address', address)
    .eq('city', city)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = "No rows found" error
    throw error; 
  }

  if (data) return data.id;

  // Insert new shop if not found
  const { data: inserted, error: insertErr } = await supabase
    .from('shops')
    .insert({ name, address, city, lat, lng })
    .select('id')
    .single();

  if (insertErr) throw insertErr;
  return inserted.id;
}


export async function calculateAverageRating(shopName, shopId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('shop_id', shopId);

  if (error || !data || !data.length) return 0;

  const total = data.reduce((sum, r) => sum + (r.rating || 0), 0);
  return Math.round((total / data.length) * 10) / 10;
}
