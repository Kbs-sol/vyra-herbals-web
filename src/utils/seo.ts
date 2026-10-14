/**
 * Central SEO helpers for Vyra Herbals.
 *
 * Everything that turns product / category / blog data into
 *   - a `Metadata` object for Next.js `generateMetadata`
 *   - a JSON-LD blob for structured data
 * lives here so the shape stays consistent across the site.
 *
 * The site has three kinds of "money page":
 *   /product/[handle]         → PDP with Product + Offer + AggregateRating + Breadcrumb
 *   /category/[categoryName]  → Category with ItemList + Breadcrumb
 *   /blogs/[slug]             → Article with BlogPosting + Person (founder byline)
 *
 * plus sitewide Organization + WebSite emitted from the root layout.
 */

import type { Metadata } from 'next';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://vyraherbals.com').replace(/\/$/, '');
export const SITE_NAME = 'Vyra Herbals';
// Primary brand descriptor — leads with intent-heavy keywords: "natural",
// "herbal", "handmade", "chemical-free". "Ayurvedic" retained only in cultural
// long-tail slots, not as the primary positioning.
export const BRAND_DEFAULT_DESCRIPTION =
  '100% natural, handmade herbal hair care from Vyra Herbals — chemical-free, sulphate-free, paraben-free. Made fresh in India, ISO 9001:2015 & GMP certified. Free shipping across India.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/images/banner/og-image.jpg`;

// The founder — used in BlogPosting.author and Organization.founder.
export const FOUNDER = {
  name: 'Sahera Banu',
  jobTitle: 'Founder, Vyra Herbals',
  image: `${SITE_URL}/assets/images/vyra-founder.jpeg`,
  sameAs: [
    // Filled in when we have canonical founder profile links.
  ],
} as const;

// -----------------------------------------------------------------------------
// Types (loose — the DB rows aren't strictly typed anywhere else yet)
// -----------------------------------------------------------------------------

export interface SeoProduct {
  id: string | number;
  handle: string;
  title: string;
  description?: string | null;
  seo_description?: string | null;
  short_description?: string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  currency?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  category?: string | null;
  sku?: string | null;
  stock?: number | null;
  status?: number | string | null;
  brand?: string | null;
  ingredients?: string | string[] | null;
  reviews?: Array<{ rating: number | string | null }>;
  average_rating?: number | string | null;
  review_count?: number | string | null;
  faqs?: Array<{ question: string; answer: string }> | null;
}

export interface SeoBlogPost {
  id: string | number;
  handle: string;
  title: string;
  excerpt?: string | null;
  seo_description?: string | null;
  content?: string | null;
  image_url?: string | null;
  author?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  tags?: string[] | null;
}

export interface SeoCategory {
  slug: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  productCount?: number;
}

// -----------------------------------------------------------------------------
// Utility formatters
// -----------------------------------------------------------------------------

function truncate(input: string | null | undefined, max: number): string {
  if (!input) return '';
  const clean = input.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + '…';
}

function stripHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return `${SITE_URL}${pathOrUrl}`;
  return `${SITE_URL}/${pathOrUrl}`;
}

function priceToNumber(price: number | string | null | undefined): number | undefined {
  if (price === null || price === undefined) return undefined;
  const n = typeof price === 'number' ? price : Number(String(price).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : undefined;
}

function averageRating(product: SeoProduct): { rating?: number; count?: number } {
  const explicitRating = priceToNumber(product.average_rating as any);
  const explicitCount = priceToNumber(product.review_count as any);
  if (explicitRating && explicitCount) return { rating: explicitRating, count: Math.round(explicitCount) };

  if (Array.isArray(product.reviews) && product.reviews.length) {
    const nums = product.reviews
      .map((r) => Number(r.rating))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 5);
    if (nums.length) {
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return { rating: Number(avg.toFixed(1)), count: nums.length };
    }
  }
  return {};
}

// -----------------------------------------------------------------------------
// Category name / slug helpers (Vyra uses spaces in slugs — normalise on read)
// -----------------------------------------------------------------------------

/**
 * The live site's category route uses raw category names as slugs
 * (`/category/Hair%20Oil`). This decodes + humanises them so titles/H1s
 * don't ship URL-encoded text.
 */
export function categorySlugToName(raw: string): string {
  return decodeURIComponent(raw).replace(/[-_]+/g, ' ').trim();
}

// -----------------------------------------------------------------------------
// Metadata builders — one per page type
// -----------------------------------------------------------------------------

export function buildProductMetadata(product: SeoProduct): Metadata {
  const canonical = `${SITE_URL}/product/${product.handle}`;

  const priceStr = priceToNumber(product.price) ? ` — ₹${priceToNumber(product.price)}` : '';
  const title = `${product.title}${priceStr} | Vyra Herbals`.slice(0, 70);

  // Prefer curated seo_description → short_description → derived from long description.
  const rawDesc =
    product.seo_description ||
    product.short_description ||
    stripHtml(product.description || '') ||
    `${product.title} — herbal, chemical-free formulation from Vyra Herbals. ISO 9001:2015 & GMP certified. Free shipping across India.`;
  const description = truncate(rawDesc, 158);

  const image = absoluteUrl(product.image_url || product.images?.[0]) || DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: image, width: 1200, height: 1200, alt: product.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    // Sensible product-page defaults; category-specific keywords go in the copy, not the tag.
    other: {
      'product:price:amount': priceToNumber(product.price)?.toString() || '',
      'product:price:currency': product.currency || 'INR',
    },
  };
}

export function buildCategoryMetadata(category: SeoCategory): Metadata {
  const canonical = `${SITE_URL}/category/${encodeURIComponent(category.slug)}`;

  // Category-specific "money" titles from the SEO audit.
  const canned = categoryCopy(category.name);
  const title = canned.title;
  const description = truncate(category.description || canned.description, 158);

  const image = absoluteUrl(category.image_url) || DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: category.name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export function buildBlogMetadata(post: SeoBlogPost): Metadata {
  const canonical = `${SITE_URL}/blogs/${post.handle}`;

  const title = `${post.title} | Vyra Herbals`.slice(0, 70);
  const description = truncate(
    post.seo_description || post.excerpt || stripHtml(post.content || '') || BRAND_DEFAULT_DESCRIPTION,
    158,
  );
  const image = absoluteUrl(post.image_url) || DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    authors: [{ name: post.author || FOUNDER.name }],
    openGraph: {
      type: 'article',
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
      publishedTime: post.published_at || post.created_at || undefined,
      modifiedTime: post.updated_at || post.published_at || undefined,
      authors: [post.author || FOUNDER.name],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

// -----------------------------------------------------------------------------
// Category copywriting bank — matches the SEO audit's suggested titles
// -----------------------------------------------------------------------------

function categoryCopy(name: string): { title: string; description: string } {
  const key = name.toLowerCase().replace(/\s+/g, '');
  const map: Record<string, { title: string; description: string }> = {
    hairoil: {
      title: 'Natural Herbal Hair Oil for Hair Fall & Growth — 100% Handmade | Vyra Herbals',
      description:
        'Shop 100% natural handmade hair oil with rosemary, neem & 9 herbs. Chemical-free, sulphate-free, paraben-free. Reduces hair fall, promotes regrowth. ISO & GMP certified. Free shipping across India.',
    },
    shampoo: {
      title: 'Chemical-Free Herbal Shampoo — Sulphate & Paraben Free | Vyra Herbals',
      description:
        'Gentle natural herbal shampoo that cleanses without stripping oils. 100% chemical-free, sulphate-free, paraben-free. Handmade in India. Free shipping.',
    },
    hairmask: {
      title: 'Natural Herbal Hair Mask Powder — Deep Nourishment & Repair | Vyra Herbals',
      description:
        '100% natural handmade hair mask powder blended with fresh herbs to strengthen roots, repair damage and add shine. Chemical-free. Free shipping.',
    },
    rosemaryleaves: {
      title: 'Rosemary Leaves for Hair Growth — 100% Pure Dried Herb | Vyra Herbals',
      description:
        'Dried rosemary leaves for hair growth infusions, oils and rinses. Farm-fresh, sun-dried. Free shipping across India.',
    },
    scalpmassager: {
      title: 'Scalp Massager for Hair Growth & Oil Application | Vyra Herbals',
      description:
        'Silicone scalp massager that boosts blood flow, spreads hair oil evenly and lifts flakes. Fits any hair length.',
    },
    neemcomb: {
      title: 'Neem Wood Comb — Anti-Static, Frizz-Reducing | Vyra Herbals',
      description:
        'Handmade neem wood comb: reduces static, eases detangling and pairs perfectly with hair oiling.',
    },
    combo: {
      title: 'Natural Herbal Hair Care Combos — Complete Handmade Kits | Vyra Herbals',
      description:
        'Save more with curated hair-care combos — oil, shampoo and tools bundled for a full chemical-free natural herbal routine.',
    },
  };
  const canned = map[key];
  if (canned) return canned;
  return {
    title: `${name} — Natural Herbal Care by Vyra Herbals`,
    description: `Explore 100% natural handmade ${name.toLowerCase()} from Vyra Herbals — chemical-free, sulphate-free formulations, ISO 9001:2015 & GMP certified. Free shipping across India.`,
  };
}

// -----------------------------------------------------------------------------
// JSON-LD builders
// -----------------------------------------------------------------------------

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: 'Vyra Herbals',
    alternateName: ['Vyra', 'Vyra Herbal'],
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/assets/images/logo-final.png`,
      width: '512',
      height: '512',
    },
    image: `${SITE_URL}/assets/images/logo-final.png`,
    founder: {
      '@type': 'Person',
      '@id': `${SITE_URL}/about#founder`,
      name: FOUNDER.name,
      jobTitle: FOUNDER.jobTitle,
      image: FOUNDER.image,
      description:
        'Vyra Herbals was founded in 2023 after a personal hair-loss journey, formulating 100% natural, handmade herbal hair oil, chemical-free shampoo, and hair masks with 9 traditional herbs including rosemary, neem, and bhringraj — drawing on India\'s Ayurvedic heritage but chemical-free by modern standards.',
    },
    foundingDate: '2023',
    foundingLocation: {
      '@type': 'Place',
      name: 'Hyderabad, Telangana, India',
    },
    knowsAbout: [
      'Natural hair care',
      'Herbal hair oil',
      'Handmade hair oil',
      'Chemical-free shampoo',
      'Sulphate-free shampoo',
      'Paraben-free hair care',
      'Rosemary hair care',
      'Natural hair growth remedies',
      'Hair fall treatment',
      'Dandruff treatment',
      'Scalp health',
      // Long-tail cultural signal retained so "ayurvedic" queries still match.
      'Ayurvedic hair care',
    ],
    naics: '446120', // Cosmetics, Beauty Supplies, and Perfume Stores
    description: BRAND_DEFAULT_DESCRIPTION,
    slogan: 'Nature. Certified. Yours.',
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
      logo: `${SITE_URL}/assets/images/logo-final.png`,
    },
    award: [
      'ISO 9001:2015 Certified Manufacturing',
      'GMP (Good Manufacturing Practices) Certified',
    ],
    hasCredential: [
      { '@type': 'EducationalOccupationalCredential', name: 'ISO 9001:2015', credentialCategory: 'certification' },
      { '@type': 'EducationalOccupationalCredential', name: 'GMP Certified', credentialCategory: 'certification' },
    ],
    areaServed: [
      { '@type': 'Country', name: 'India' },
      { '@type': 'State', name: 'Telangana' },
      { '@type': 'State', name: 'Andhra Pradesh' },
      { '@type': 'State', name: 'Karnataka' },
      { '@type': 'State', name: 'Tamil Nadu' },
      { '@type': 'State', name: 'Maharashtra' },
    ],
    sameAs: [
      'https://www.instagram.com/vyraherbals/',
      'https://www.youtube.com/@vyraherbals',
      'https://www.facebook.com/vyraherbals',
      // Fill in Amazon / Flipkart / Meesho seller pages when available — these
      // feed the GEO "entity clarity" signal the SEO audit calls out.
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@vyraherbals.com',
        areaServed: 'IN',
        availableLanguage: ['en', 'hi', 'te'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        url: `${SITE_URL}/contact`,
        areaServed: 'IN',
        availableLanguage: ['en', 'hi', 'te'],
      },
    ],
  };
}

/**
 * LocalBusiness / Store JSON-LD — feeds Google's local knowledge panel
 * ("Vyra Herbals Hyderabad" queries) and Maps if a GBP is claimed against
 * the same address.
 *
 * This is separate from Organization so the two can coexist. Google
 * accepts multiple entities per page as long as `@id` values are unique.
 */
export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Store', 'HealthAndBeautyBusiness'],
    '@id': `${SITE_URL}/#localbusiness`,
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}/assets/images/logo-final.png`,
    telephone: '+91-XXXXXXXXXX', // Replace with real phone when public
    email: 'support@vyraherbals.com',
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Credit Card, Debit Card, UPI, Netbanking, Cash on Delivery',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      addressCountry: 'IN',
    },
    areaServed: [
      { '@type': 'Country', name: 'India' },
      { '@type': 'State', name: 'Telangana' },
      { '@type': 'State', name: 'Andhra Pradesh' },
      { '@type': 'State', name: 'Karnataka' },
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '19:00',
      },
    ],
    sameAs: [
      'https://www.instagram.com/vyraherbals/',
      'https://www.youtube.com/@vyraherbals',
    ],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: absoluteUrl(it.url),
    })),
  };
}

export function productJsonLd(product: SeoProduct) {
  const canonical = `${SITE_URL}/product/${product.handle}`;
  const price = priceToNumber(product.price);
  const compareAt = priceToNumber(product.compare_at_price);
  const inStock = (product.stock ?? 1) > 0 && (String(product.status ?? '1') !== '0');

  const { rating, count } = averageRating(product);

  const images = ([product.image_url, ...(product.images || [])]
    .filter(Boolean) as string[])
    .map((u) => absoluteUrl(u) as string)
    .slice(0, 6);

  const node: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: product.title,
    sku: product.sku || String(product.id),
    mpn: product.sku || String(product.id),
    brand: { '@type': 'Brand', name: product.brand || SITE_NAME },
    image: images.length ? images : [DEFAULT_OG_IMAGE],
    description: truncate(stripHtml(product.description || product.short_description || ''), 500),
    category: product.category || undefined,
    url: canonical,
  };

  if (price) {
    node.offers = {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: product.currency || 'INR',
      price: price.toFixed(2),
      priceValidUntil: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
      ...(compareAt && compareAt > price ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: price.toFixed(2), priceCurrency: product.currency || 'INR' } } : {}),
    };
  }

  if (rating && count) {
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.toFixed(1),
      reviewCount: count,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return node;
}

export function faqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  if (!faqs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function blogPostingJsonLd(post: SeoBlogPost) {
  const canonical = `${SITE_URL}/blogs/${post.handle}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonical}#article`,
    headline: post.title,
    description: truncate(post.seo_description || post.excerpt || stripHtml(post.content || ''), 300),
    image: absoluteUrl(post.image_url) || DEFAULT_OG_IMAGE,
    author: {
      '@type': 'Person',
      '@id': `${SITE_URL}/about#founder`,
      name: post.author || FOUNDER.name,
      jobTitle: FOUNDER.jobTitle,
      image: FOUNDER.image,
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    mainEntityOfPage: canonical,
    articleSection: 'Hair Care',
    keywords: post.tags?.join(', ') || undefined,
  };
}

/**
 * HowTo JSON-LD — targets "how to apply hair oil", "how to use rosemary
 * leaves", "how to oil hair overnight" and other AEO-heavy queries. Google
 * strips the rich result for HowTo in most markets since Sep 2023, BUT
 * Bing, DuckDuckGo, and ChatGPT/Perplexity/Claude ALL still consume it
 * heavily for answer generation. This is the highest-ROI schema for GEO.
 *
 * Attach one per concern page + one on the About/routine pages.
 */
export function howToJsonLd(params: {
  name: string;
  description: string;
  image?: string;
  totalTime?: string; // ISO 8601 duration, e.g. "PT10M" for 10 minutes
  estimatedCost?: { currency: string; value: number };
  supply?: string[];
  tool?: string[];
  steps: Array<{ name: string; text: string; image?: string; url?: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.name,
    description: params.description,
    image: params.image ? absoluteUrl(params.image) : DEFAULT_OG_IMAGE,
    ...(params.totalTime ? { totalTime: params.totalTime } : {}),
    ...(params.estimatedCost
      ? {
          estimatedCost: {
            '@type': 'MonetaryAmount',
            currency: params.estimatedCost.currency,
            value: params.estimatedCost.value,
          },
        }
      : {}),
    ...(params.supply?.length
      ? { supply: params.supply.map((s) => ({ '@type': 'HowToSupply', name: s })) }
      : {}),
    ...(params.tool?.length
      ? { tool: params.tool.map((t) => ({ '@type': 'HowToTool', name: t })) }
      : {}),
    step: params.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.image ? { image: absoluteUrl(s.image) } : {}),
      ...(s.url ? { url: s.url } : {}),
    })),
  };
}

/**
 * Speakable JSON-LD — marks a set of CSS selectors as "read aloud" content
 * for Google Assistant / Alexa / Siri voice answers. Attach to article/blog
 * pages and concern landing pages that contain a "quick answer" block.
 */
export function speakableJsonLd(cssSelectors: string[] = ['.quick-answer', 'h1', '[data-speakable]']) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
  };
}

/**
 * Video schema — attach when embedding a YouTube video (hero, testimonials,
 * routine explainer). Feeds Google Video results, YouTube's own Suggested
 * shelf, and AI assistants that quote captions.
 */
export function videoObjectJsonLd(params: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string; // ISO 8601 date
  contentUrl?: string;
  embedUrl?: string;
  duration?: string; // ISO 8601 duration
  publisher?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: params.name,
    description: params.description,
    thumbnailUrl: absoluteUrl(params.thumbnailUrl),
    uploadDate: params.uploadDate,
    ...(params.contentUrl ? { contentUrl: params.contentUrl } : {}),
    ...(params.embedUrl ? { embedUrl: params.embedUrl } : {}),
    ...(params.duration ? { duration: params.duration } : {}),
    publisher: {
      '@type': 'Organization',
      name: params.publisher || SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/assets/images/logo-final.png`,
      },
    },
  };
}

export function itemListJsonLd(products: Array<Pick<SeoProduct, 'handle' | 'title' | 'image_url' | 'price'>>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${SITE_URL}/product/${p.handle}`,
      name: p.title,
    })),
  };
}

// -----------------------------------------------------------------------------
// Render helper — inline JSON-LD safely
// -----------------------------------------------------------------------------

/**
 * Serialise a JSON-LD object for injection into a `<script type="application/ld+json">`.
 * Escapes closing `</script>` sequences to defeat XSS via user-authored content.
 */
export function jsonLdString(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
