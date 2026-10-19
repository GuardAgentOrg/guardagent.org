const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[Supabase] Initialized Supabase client connection.');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('[Supabase] No valid Supabase credentials in .env. Running in Demo/Local Store Mode.');
}

function isSupabaseConfigured() {
  return supabase !== null;
}

module.exports = {
  supabase,
  isSupabaseConfigured
};
