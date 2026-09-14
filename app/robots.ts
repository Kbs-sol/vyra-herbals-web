import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/utils/seo';

/**
 * robots.txt policy.
 *
 * Goals, in order:
 *   1) Let every legit search crawler (Google, Bing, DuckDuckGo) index the
 *      product / category / blog space.
 *   2) EXPLICITLY WELCOME AI-assistant crawlers (GPTBot, ClaudeBot,
 *      PerplexityBot, Google-Extended, meta-externalagent). The audit
 *      surfaces that ChatGPT is already sending sessions to the site; the
 *      current Cloudflare-managed robots.txt blocks these — that's fighting
 *      our own GEO strategy. This file overrides it.
 *   3) Keep utility pages OUT of the search index — cart, checkout, login,
 *      signup, profile, orders, wishlist, search, track-order, payment
 *      failure, transaction, and the API surface. These pages either
 *      duplicate content, contain personal data, or can never rank.
 *
 * Note on precedence: on Vercel, `app/robots.ts` renders `/robots.txt` at the
 * origin. If Cloudflare is in front of the origin with a robots override
 * enabled, disable "Managed robots.txt" in the Cloudflare zone → SEO panel
 * for this file to take effect.
 */

// Paths crawlers should NEVER touch.
const DISALLOW: string[] = [
  '/api/',
  '/admin/',
  '/cart',
  '/checkout',
  '/login',
  '/signup',
  '/profile',
  '/orders',
  '/order-placed',
  '/wishlist',
  '/search',
  '/track-order',
  '/payment-failed',
  '/transaction',
  '/*?utm_', // block URL-parameter dupes from ad campaigns
  '/*?fbclid=',
  '/*?gclid=',
];

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // controls Bard/Gemini training
  'GoogleOther',
  'meta-externalagent',
  'Applebot-Extended',
  'Bytespider',
  'Amazonbot',
  'CCBot',
  'DuckAssistBot',
  'MistralAI-User',
  'YouBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },

      // Preferred search crawlers — with a courteous crawl delay to avoid
      // hammering the free Supabase tier.
      { userAgent: 'Googlebot', allow: '/', disallow: DISALLOW, crawlDelay: 1 },
      { userAgent: 'Bingbot', allow: '/', disallow: DISALLOW, crawlDelay: 1 },
      { userAgent: 'DuckDuckBot', allow: '/', disallow: DISALLOW, crawlDelay: 1 },

      // AI assistants — one rule per agent so Google's parser (which merges
      // conflicting user-agent lines) can't downgrade us to the wildcard.
      ...AI_CRAWLERS.map((ua) => ({
        userAgent: ua,
        allow: '/',
        disallow: DISALLOW,
      })),
    ],
    // Both sitemap and product feed are discoverable from robots.txt.
    // Merchant Center reads feed.xml on its own schedule, but including it
    // here also lets other crawlers (e.g. Bing Merchant, Yandex Products)
    // find it without extra config.
    //
    // NOTE: `/llms.txt` and `/ai.txt` are not sitemaps, but many AI
    // assistants look for them at the site root regardless — no need to
    // advertise them here (advertising them via robots.txt would flag
    // them as sitemaps to Google, which is incorrect).
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/feed.xml`],
    host: SITE_URL,
  };
}
