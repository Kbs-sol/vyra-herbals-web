/**
 * ASSUMPTION FLAG: this repo almost certainly already has a Supabase client
 * helper somewhere (e.g. src/lib/supabase.ts or src/utils/supabase/server.ts).
 * If so, DELETE this file and point the imports in:
 *   - src/services/communications/queue/dbQueue.ts
 *   - src/services/communications/logging/messageLogger.ts
 *   - src/services/communications/logging/eventLogger.ts
 * at your existing client instead. This stub is only here so the module is
 * runnable standalone without access to the rest of the codebase.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars for supabaseAdmin client'
    );
  }

  _client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _client;
}
