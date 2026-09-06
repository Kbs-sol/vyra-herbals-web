/**
 * Fail-fast accessors for server-only secrets.
 *
 * Every secret used to have an inline `|| 'some-literal'` fallback. That meant a
 * deployment with a missing env var silently kept running on a value that is
 * public in the source tree — anyone could forge an admin JWT. These accessors
 * throw instead, so a misconfigured environment fails loudly at the first
 * request rather than quietly serving an insecure app.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable ${name}. Refusing to start with an insecure default.`
    );
  }
  return value;
}

let cachedJwtSecret: Uint8Array | null = null;

/** HS256 key for the admin session cookie. Throws when JWT_SECRET is unset. */
export function getAdminJwtSecret(): Uint8Array {
  if (!cachedJwtSecret) {
    const secret = required('JWT_SECRET');
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters.');
    }
    cachedJwtSecret = new TextEncoder().encode(secret);
  }
  return cachedJwtSecret;
}

/** Supabase URL for server-side clients. */
export function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL.');
  }
  return url;
}

/**
 * Service-role key. Deliberately has NO anon-key fallback: falling back to the
 * anon key makes privileged server routes fail in confusing, RLS-dependent ways
 * instead of telling you the key is missing.
 */
export function getSupabaseServiceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY');
}

export const isProduction = process.env.NODE_ENV === 'production';
