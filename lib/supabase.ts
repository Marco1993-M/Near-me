import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

function getSupabaseUrl() {
  // Prefer the Next.js env names; keep the Vite keys as a temporary bridge
  // while legacy files still exist in the repo.
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  // Prefer the Next.js env names; keep the Vite keys as a temporary bridge
  // while legacy files still exist in the repo.
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_KEY;
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getSupabaseClient() {
  if (client) {
    return client;
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return null;
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

export function getSupabaseServerClient() {
  if (serverClient) {
    return serverClient;
  }

  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();
  const key = serviceRoleKey ?? anonKey;

  if (!url || !key) {
    return null;
  }

  serverClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClient;
}
