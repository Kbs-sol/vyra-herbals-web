import { createClient } from '@supabase/supabase-js';

import CookieUtils from './cookieUtils';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './serverEnv';

// Client-side (public) Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  }
);

// Server-side Supabase client (use service role key)
export function createServerSupabase() {
  if (typeof window === 'undefined') {
    // Fix for Node >= 17 fetch timeouts with IPv6 when connecting to Supabase/Vercel
    try {
      const dns = require('dns');
      if (typeof dns.setDefaultResultOrder === 'function') {
        dns.setDefaultResultOrder('ipv4first');
      }
    } catch (e) {
      // Ignore
    }
  }

  // No anon-key fallback on purpose. Server routes are written assuming they
  // bypass RLS; silently downgrading to the anon key turns that assumption into
  // scattered, hard-to-diagnose empty results and partial writes instead of one
  // clear configuration error.
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

export default supabase;
