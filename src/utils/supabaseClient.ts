import { createClient } from '@supabase/supabase-js';

import CookieUtils from './cookieUtils';

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

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
  }
  return createClient(url || '', key || '', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

export default supabase;
