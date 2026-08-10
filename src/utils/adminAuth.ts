import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

import { getAdminJwtSecret } from './serverEnv';

/**
 * Single source of truth for admin API authentication.
 *
 * /api/admin/auth issues an httpOnly `admin_token` cookie containing a JWT
 * signed (HS256) with JWT_SECRET. Every admin API route must verify it before
 * returning data or mutating anything — otherwise the endpoint is open to the
 * whole internet.
 *
 * There is intentionally no fallback secret. A literal default in the source
 * tree lets anyone who reads the repository mint a valid admin cookie, so a
 * missing JWT_SECRET must fail the request rather than silently downgrade to a
 * known key.
 */

/** Returns true only for a present, valid, unexpired admin session token. */
export async function verifyAdminAuth(request: NextRequest | Request): Promise<boolean> {
  const token = readAdminToken(request);
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecret());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Guard helper for route handlers. Returns a 401 response to return early with,
 * or `null` when the caller holds a valid admin session.
 *
 *   const denied = await requireAdmin(request);
 *   if (denied) return denied;
 */
export async function requireAdmin(request: NextRequest | Request): Promise<NextResponse | null> {
  if (await verifyAdminAuth(request)) return null;
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

/**
 * Read the admin cookie from either a NextRequest (which parses cookies for us)
 * or a plain Request (where we parse the Cookie header ourselves).
 */
function readAdminToken(request: NextRequest | Request): string | null {
  const asNext = request as NextRequest;
  if (typeof asNext.cookies?.get === 'function') {
    return asNext.cookies.get('admin_token')?.value || null;
  }

  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === 'admin_token') return decodeURIComponent(rest.join('='));
  }
  return null;
}
