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
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') return null;
          let i = 0;
          let chunk = CookieUtils.getCookie(`${key}-${i}`);

          if (!chunk) {
            // Fallback for an existing non-chunked session
            const val = CookieUtils.getCookie(key);
            return val ? decodeURIComponent(val) : null;
          }

          let result = '';
          while (chunk) {
            result += chunk;
            i++;
            chunk = CookieUtils.getCookie(`${key}-${i}`);
          }
          return decodeURIComponent(result);
        },
        setItem: (key, value) => {
          if (typeof window === 'undefined') return;
          const encoded = encodeURIComponent(value);
          const chunkSize = 3000; // Safe beneath 4096 cookie limit
          let i = 0;

          // Clear legacy non-chunked cookie just in case
          CookieUtils.deleteCookie(key);

          for (let start = 0; start < encoded.length; start += chunkSize) {
            CookieUtils.setCookie(`${key}-${i}`, encoded.substring(start, start + chunkSize), 90);
            i++;
          }

          // Clean up any old overflow chunks
          while (CookieUtils.getCookie(`${key}-${i}`)) {
            CookieUtils.deleteCookie(`${key}-${i}`);
            i++;
          }
        },
        removeItem: (key) => {
          if (typeof window === 'undefined') return;
          CookieUtils.deleteCookie(key);
          let i = 0;
          while (CookieUtils.getCookie(`${key}-${i}`)) {
            CookieUtils.deleteCookie(`${key}-${i}`);
            i++;
          }
        }
      }
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
