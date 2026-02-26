import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — using placeholder');
  supabase = createClient('https://placeholder.supabase.co', 'placeholder');
} else {
  // In dev mode, proxy through Vite to avoid browser network restrictions
  const effectiveUrl = import.meta.env.DEV ? '/supabase-proxy' : supabaseUrl;
  // @ts-ignore — debug: expose URL for troubleshooting
  (window as any).__SUPABASE_URL__ = effectiveUrl;
  supabase = createClient(effectiveUrl, supabaseAnonKey);
}

export { supabase };
