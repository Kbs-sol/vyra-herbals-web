import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Blanket authentication gate for the admin API surface.
 *
 * Individual admin routes also guard themselves, but relying only on per-route
 * checks means every new file is one forgotten line away from being an open,
 * service-role-backed endpoint — which is exactly how a dozen of these routes
 * ended up publicly writable. This middleware makes the default deny, so a new
 * `app/api/admin/**` route is protected the moment it exists.
 */

const PUBLIC_ADMIN_PATHS = new Set([
  '/api/admin/auth', // issues the session itself; guards its own actions
]);

function secret(): Uint8Array | null {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) return null;
  return new TextEncoder().encode(value);
}

/**
 * Developer harnesses (`/test-order`, `/test-coupon`, `/test-delivery`) that
 * drive the real order, payment and shipping APIs. Useful locally, but on the
 * live site they are an unadvertised control panel, so they are hidden in
 * production rather than deleted.
 */
const TEST_PAGE_PREFIX = '/test-';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(TEST_PAGE_PREFIX)) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const key = secret();
  if (!key) {
    // Misconfigured deployment: fail closed rather than serve admin data.
    console.error('[middleware] JWT_SECRET missing or too short — denying admin API access.');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    // WhatsApp admin/support + manual-send routes, and the internal HTTP
    // event-trigger endpoints (/api/events/*), all read customer data or can
    // send messages — so they sit behind the same deny-by-default admin gate.
    // (The Meta webhook lives at /api/webhooks/whatsapp and verifies its own
    // HMAC signature, so it is deliberately NOT matched here.)
    '/api/whatsapp/:path*',
    '/api/events/:path*',
    '/test-:path*',
  ],
};
