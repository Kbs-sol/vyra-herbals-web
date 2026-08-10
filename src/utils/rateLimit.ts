import { NextResponse } from 'next/server';

/**
 * Lightweight fixed-window rate limiter for API routes.
 *
 * Deliberately in-process: it needs no extra infrastructure and still stops the
 * abuse that actually costs money here — OTP-SMS pumping, admin-login
 * brute-force, and review/coupon spam. On a multi-instance deployment each
 * instance keeps its own counter, so the effective limit is
 * `limit x instances`; that is still a hard ceiling, just a looser one. Swap the
 * `hits` Map for Redis/Upstash if you outgrow a single region.
 */

type Bucket = { count: number; resetAt: number };

const hits = new Map<string, Bucket>();

// Bound memory: drop expired buckets whenever the map grows past this.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, bucket] of hits) {
    if (bucket.resetAt <= now) hits.delete(key);
  }
}

/**
 * Best-effort client identity. Trusts `x-forwarded-for` because the app runs
 * behind Vercel's proxy, which overwrites that header — do not rely on this
 * when serving traffic directly from an untrusted network.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Consume one token for `key`. Returns whether the caller is under `limit`
 * requests within the trailing `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (hits.size > MAX_TRACKED_KEYS) sweep(now);

  const bucket = hits.get(key);
  if (!bucket || bucket.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds };
}

/**
 * Apply a rate limit and return a ready-to-send 429 when it trips, or `null`
 * when the request may proceed.
 *
 *   const limited = enforceRateLimit(req, 'otp:send', 5, 60_000);
 *   if (limited) return limited;
 */
export function enforceRateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number,
  identity?: string
): NextResponse | null {
  const key = `${scope}:${identity || clientIp(req)}`;
  const result = rateLimit(key, limit, windowMs);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'Cache-Control': 'no-store',
      },
    }
  );
}
