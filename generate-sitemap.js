import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read from your existing .env variables with VITE_ prefix
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;
const baseUrl = 'https://www.near-me.cafe';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple slugify function to create clean URLs
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
}

async function generateSitemap() {
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('name');

    if (error) {
      console.error('Error fetching shops:', error);
      return;
    }

    const urls = shops.map(shop => {
      const slug = slugify(shop.name);
      return `<url><loc>${baseUrl}/shop/${slug}</loc></url>`;
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.join('\n') +
      `\n</urlset>`;

    // Ensure directory exists or adjust path accordingly
    fs.writeFileSync('public/sitemap.xml', sitemap);

    console.log(`✅ Sitemap generated with ${shops.length} entries.`);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

generateSitemap();
