import { createClient } from '@supabase/supabase-js';

// ✅ Hardcoded credentials for debugging (temporary)
const supabaseUrl = 'https://mqfknhzpjzfhuxusnasl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZmtuaHpwanpmaHV4dXNuYXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjU5NTYsImV4cCI6MjA2MzQwMTk1Nn0.mtg3moHttl9baVg3VWFTtMMjQc_toN5iwuYbZfisgKs';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('[supabase.js] Supabase client created:', supabase);
console.log('[supabase.js] typeof supabase.from:', typeof supabase.from); // should be "function"

export default supabase;
