import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import { getAdminJwtSecret, isProduction } from '@/utils/serverEnv';
import { enforceRateLimit } from '@/utils/rateLimit';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';

/**
 * Admin session issuance.
 *
 * Credentials come only from the environment — there is no hard-coded fallback
 * pair, because a literal in the source tree is a published admin password.
 *
 * Two ways to configure the password, in order of preference:
 *   ADMIN_PASSWORD_HASH  scrypt digest as `scrypt:<saltHex>:<keyHex>` (preferred —
 *                        the plaintext never exists in the environment)
 *   ADMIN_PASSWORD       plaintext, compared in constant time (acceptable, but a
 *                        leak of the env leaks the password)
 *
 * Generate a hash with:
 *   node -e "const{randomBytes,scryptSync}=require('crypto');const s=randomBytes(16);console.log('scrypt:'+s.toString('hex')+':'+scryptSync(process.argv[1],s,64).toString('hex'))" 'your-password'
 */

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Constant-time string comparison that does not leak length via early exit. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Verify a candidate password against `scrypt:<salt>:<key>`. */
function verifyScrypt(password: string, stored: string): boolean {
  const [, saltHex, keyHex] = stored.split(':');
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

function checkCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!expectedEmail || (!passwordHash && !plainPassword)) {
    throw new Error(
      'Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD).'
    );
  }

  // Always evaluate both factors so a wrong email and a wrong password take the
  // same amount of work — otherwise response timing enumerates valid emails.
  const emailOk = safeEqual(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase());
  const passwordOk = passwordHash
    ? verifyScrypt(password, passwordHash)
    : safeEqual(password, plainPassword as string);

  return emailOk && passwordOk;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body || {};

    if (action === 'login') {
      const limited = enforceRateLimit(request, 'admin:login', LOGIN_LIMIT, LOGIN_WINDOW_MS);
      if (limited) return limited;

      const email = typeof body.email === 'string' ? body.email : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      if (!checkCredentials(email, password)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // `jti` gives every session a unique id, so tokens are distinguishable in
      // logs and a future revocation list has something to key on.
      const token = await new SignJWT({ email: email.trim().toLowerCase(), role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setJti(randomBytes(16).toString('hex'))
        .setExpirationTime('8h')
        .sign(getAdminJwtSecret());

      const cookieStore = await cookies();
      cookieStore.set('admin_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 60 * 60 * 8,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        user: { email: email.trim().toLowerCase(), role: 'admin' },
      });
    }

    if (action === 'logout') {
      const cookieStore = await cookies();
      cookieStore.delete('admin_token');
      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    if (action === 'verify') {
      const cookieStore = await cookies();
      const token = cookieStore.get('admin_token')?.value;

      if (!token) {
        return NextResponse.json({ success: false, error: 'No token found' }, { status: 401 });
      }

      try {
        const { payload } = await jwtVerify(token, getAdminJwtSecret());
        if (payload.role !== 'admin') {
          return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({
          success: true,
          user: { email: payload.email, role: payload.role },
        });
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    // Never echo the message back: it can carry configuration details.
    console.error('Admin auth error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
