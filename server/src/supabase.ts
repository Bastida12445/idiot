import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, supabaseConfigured } from './config.js';

export const publicSupabase: SupabaseClient | null = supabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export const secretSupabase: SupabaseClient | null = config.supabaseUrl && config.supabaseSecret
  ? createClient(config.supabaseUrl, config.supabaseSecret, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export const userClient = (token: string): SupabaseClient => {
  if (!supabaseConfigured) throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
};
