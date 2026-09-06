import { NextResponse } from 'next/server';
import { createServerSupabase } from './supabaseClient';

/**
 * Server-side identity resolution for customer-facing API routes.
 *
 * The rule these helpers exist to enforce: a route must never take `user_id`
 * from the request body. The browser controls the body, so trusting it lets any
 * caller read or mutate another customer's cart, wishlist, or orders. The only
 * trustworthy source of identity is the Supabase access token in the
 * `Authorization: Bearer <jwt>` header, which is signed by Supabase and
 * verified here on every call.
 */

export type AuthedUser = {
  id: string;
  email: string | null;
  /** 2 = admin in `public.users.role`; 1 (or missing) = ordinary customer. */
  role: number;
};

/** Extract the bearer token, or null when the header is absent/malformed. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Verify the caller's Supabase access token and resolve their profile role.
 * Returns null for anonymous or invalid-token callers.
 */
export async function getAuthedUser(req: Request, supabase?: any): Promise<AuthedUser | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const client = supabase || createServerSupabase();

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;

  const user = data.user;

  let role = 1;
  try {
    const { data: profile } = await client
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role != null) role = Number(profile.role) || 1;
  } catch {
    // Role lookup is an enrichment; a failure must not escalate privileges,
    // so we keep the least-privileged default.
  }

  return { id: user.id, email: user.email ?? null, role };
}

/** Standard 401 for routes that require a signed-in customer. */
export function unauthorized(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** Standard 403 for an authenticated caller reaching for someone else's data. */
export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Resolve the caller or produce a 401 response.
 *
 *   const auth = await requireUser(req);
 *   if ('response' in auth) return auth.response;
 *   // auth.user is verified from here on
 */
export async function requireUser(
  req: Request,
  supabase?: any
): Promise<{ user: AuthedUser } | { response: NextResponse }> {
  const user = await getAuthedUser(req, supabase);
  if (!user) return { response: unauthorized() };
  return { user };
}
