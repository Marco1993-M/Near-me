import supabase from './supabase.js';

export async function getOrCreateShop(name, address, city, lat, lng) {
  console.log('getOrCreateShop function called');
  // Normalize inputs to lowercase, trimmed values
  const normalizedName = name?.trim().toLowerCase() || '';
  const normalizedAddress = address?.trim().toLowerCase() || '';
  const normalizedCity = city?.trim().toLowerCase() || '';

  try {
    // Search with case-insensitive match using ilike
    const { data, error } = await supabase
      .from('shops')
      .select('id')
      .ilike('name', normalizedName)
      .ilike('address', normalizedAddress)
      .ilike('city', normalizedCity)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase select error:', error);
      throw error;
    }

    if (data) {
      console.log('Shop found, returning existing ID:', data.id);
      return data.id;
    }

    // Insert new shop
    const { data: inserted, error: insertErr } = await supabase
      .from('shops')
      .insert({
        name: normalizedName,
        address: normalizedAddress,
        city: normalizedCity,
        lat,
        lng
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('Supabase insert error:', insertErr);
      throw insertErr;
    }

    console.log('New shop inserted with ID:', inserted.id);
    return inserted.id;

  } catch (err) {
    console.error('getOrCreateShop failed:', err);
    throw err;
  }
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
