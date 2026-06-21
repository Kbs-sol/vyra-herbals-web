import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Single source of truth for admin API authentication.
 *
 * /api/admin/auth issues an httpOnly `admin_token` cookie containing a JWT
 * signed (HS256) with JWT_SECRET. Every admin API route must verify it before
 * returning data or mutating anything — otherwise the endpoint is open to the
 * whole internet. The default secret here MUST match the one the auth route
 * signs with, so verification still succeeds if JWT_SECRET is ever unset.
 */
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'vyra-herbals-admin-secret-key-2024'
);

/** Returns true only for a present, valid, unexpired admin session token. */
export async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
