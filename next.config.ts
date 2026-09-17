import type { NextConfig } from 'next';

/**
 * Content-Security-Policy for the storefront.
 *
 * Scope note: `script-src` still allows 'unsafe-inline' and 'unsafe-eval'
 * because Next.js's inline bootstrap, Google Tag Manager and the Meta Pixel all
 * require them, and styled-components injects inline <style> tags. That means
 * this policy does not stop an inline-injection payload — what it does stop is
 * the far more common follow-on step of loading or exfiltrating to an
 * attacker-controlled host, since every source list is an explicit allow-list.
 * Tightening `script-src` to a nonce is the next step, and needs the GTM and
 * Pixel snippets moved to next/script with a nonce first.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https://pay.easebuzz.in https://testpay.easebuzz.in",
  // Nobody may frame the storefront: blocks clickjacking of the checkout.
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://pay.easebuzz.in https://testpay.easebuzz.in https://ebz-static.s3.ap-south-1.amazonaws.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com https://cpaas.messagecentral.com https://api.postalpincode.in https://www.icarry.in https://pay.easebuzz.in https://testpay.easebuzz.in",
  // Payment gateway and embedded marketing video.
  "frame-src 'self' https://pay.easebuzz.in https://testpay.easebuzz.in https://www.youtube.com https://www.youtube-nocookie.com https://www.facebook.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vyraherbals.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Styled components configuration
  compiler: {
    styledComponents: true,
    // Strip console output from production builds. The codebase logs order
    // payloads, cart contents, phone numbers and user ids at various points;
    // in a production bundle those land in the visitor's console and in any
    // error-reporting tool that scrapes it. `error` and `warn` are kept so
    // genuine failures remain diagnosable.
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Caching and compression headers
  async headers() {
    return [
      // Cache static assets for 1 year
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts for 1 year
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Never let an API response be cached by a proxy or the browser: these
      // carry per-customer data and, for admin routes, privileged data.
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // Sitemap / feed / llms.txt / ai.txt — these are read by BOTS, not
      // people. Aggressive caching with SWR is fine; explicit `X-Robots-Tag`
      // keeps them out of a search-result page's "site:" listing (Google
      // occasionally indexes .xml/.txt as results, which pollutes clicks).
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=900, stale-while-revalidate=3600' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      {
        source: '/feed.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=900, stale-while-revalidate=3600' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      {
        source: '/llms.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      {
        source: '/ai.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=86400, stale-while-revalidate=604800' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      // PWA manifest — small and cache-friendly, but must revalidate weekly.
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      // security.txt — long cache, immutable-in-practice.
      {
        source: '/.well-known/security.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
        ],
      },
      // Baseline security headers for every response.
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Deny hardware/permission APIs the storefront never uses, so an
          // injected script cannot quietly reach for them.
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()',
          },
          // Force HTTPS for a year. Safe here because the site is HTTPS-only
          // behind Vercel; do not enable on a host that still serves plain HTTP.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
    ];
  },

  // ---------------------------------------------------------------------------
  // SEO redirects — permanent (301) so link equity transfers to the canonical.
  //
  // Rationale
  // ---------
  //  - Non-www → apex canonical: the site.metadata + sitemap all use
  //    https://vyraherbals.com. Any inbound link that hits www.* must fold
  //    into that one canonical, else Google splits authority.
  //  - Trailing-slash normalisation for content pages: `/about/` and `/about`
  //    should not both index.
  //  - Legacy paths from the old repo: /store, /shop-all, /collections/*
  //    still receive backlinks; redirect them to the new /category/* routes.
  //  - Blog `.html` suffix cleanup — pre-migration URLs.
  // ---------------------------------------------------------------------------
  async redirects() {
    return [
      // Legacy /collections/... → /category/...
      { source: '/collections/:slug', destination: '/category/:slug', permanent: true },
      // Legacy /shop-all or /store → homepage (which now lists everything)
      { source: '/store', destination: '/', permanent: true },
      { source: '/shop-all', destination: '/', permanent: true },
      // Legacy /product.html?id=... never worked cleanly — send them home so
      // they can search rather than land on a 404.
      { source: '/product.html', destination: '/', permanent: true },
      // Legacy blog URLs
      { source: '/blog/:slug', destination: '/blogs/:slug', permanent: true },
      // NOTE: Do NOT add case-normalising redirects for /concern/* here.
      // Next.js's path-to-regexp matcher on Vercel treats source paths
      // case-INsensitively, so `{ source: '/concern/Hair-Fall', destination:
      // '/concern/hair-fall' }` matches its own target and triggers
      // ERR_TOO_MANY_REDIRECTS on the very URL it was meant to protect.
      // The correct URLs are already lowercase; a Title-Case hit will simply
      // 404, which is the safe outcome.
    ];
  },

  // Optimize bundle size
  webpack: (config, { isServer }) => {
    if (!isServer && config.optimization && config.optimization.splitChunks) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        // Separate vendor chunks
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        // Common chunks used across pages
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      };
    }
    return config;
  },

  // ESLint configuration
  eslint: {
    // Allow build to succeed even with ESLint warnings
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    // Type errors fail the build. Keep it this way: silencing the compiler is
    // how a real bug like `!rating > 0` (boolean compared to a number, in
    // AddReview) survived in shipped code. Run `npm run typecheck` locally for
    // the same check without a full build.
    ignoreBuildErrors: false,
  },

  // Do not advertise the framework to attackers scanning for version-specific bugs.
  poweredByHeader: false,
};

export default nextConfig;
