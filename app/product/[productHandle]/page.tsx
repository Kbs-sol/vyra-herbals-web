import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/utils/supabaseClient';
import {
  breadcrumbJsonLd,
  buildProductMetadata,
  faqJsonLd,
  productJsonLd,
  SITE_URL,
  type SeoProduct,
} from '@/utils/seo';
import JsonLd from '@/Components/Shared/JsonLd';
import Singleproducts from '@/Pages/Singleproducts';

/**
 * PDP — server component wrapper.
 *
 * Responsibilities that only the server can do:
 *   1) Return a unique <title>/<meta description>/<link rel=canonical>
 *      per product. Before this file existed, every product page shipped
 *      the same root-layout title — the #1 finding in the SEO audit.
 *   2) Inject Product + Offer + AggregateRating + FAQPage + Breadcrumb
 *      JSON-LD into the pre-hydration HTML. Google's rich-result pipeline
 *      reads these on the first crawl. The audit reported ZERO schema
 *      sitewide as a CRITICAL finding.
 *   3) Server-render H1, price, short description and breadcrumb so
 *      GSC "View crawled page" shows the product content in raw HTML.
 *      The old `page.js` returned a 7-line wrapper whose only content was
 *      whatever the client component painted after JS ran.
 *
 * The heavy interactive UI (gallery, add-to-cart, reviews) stays as the
 * `<Singleproducts />` client island, but now takes an `initialProduct`
 * so it doesn't refetch the same row and cause a flash.
 */

// Revalidate every 5 minutes so admin edits appear fast without hammering DB.
// (`force-dynamic` was the previous setting — it disabled ALL caching.)
export const revalidate = 300;

type Params = { productHandle: string };

async function fetchProduct(handle: string): Promise<SeoProduct | null> {
  try {
    const decoded = decodeURIComponent(handle);
    const supabase = createServerSupabase();

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('handle', decoded)
      .limit(1);

    if (error) {
      console.error('[PDP] product fetch failed:', error.message);
      return null;
    }
    const product = (products?.[0] as any) || null;
    if (!product) return null;

    // Reviews are optional but power AggregateRating; failure to fetch them
    // must never block the page.
    let reviews: Array<{ rating: number | string | null }> = [];
    try {
      const { data: rev } = await supabase
        .from('reviews')
        .select('rating, status')
        .eq('product_id', product.id)
        .limit(200);
      reviews = (rev || []).filter((r: any) => Number(r.status ?? 1) === 1).map((r: any) => ({ rating: r.rating }));
    } catch {
      /* rating optional */
    }

    return {
      ...product,
      reviews,
      images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
    } as SeoProduct;
  } catch (e) {
    console.error('[PDP] unexpected fetch error:', (e as Error).message);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { productHandle } = await params;
  const product = await fetchProduct(productHandle);
  if (!product) {
    return {
      title: 'Product not found | Vyra Herbals',
      description: 'This product is no longer available. Explore our herbal hair care range.',
      alternates: { canonical: `${SITE_URL}/product/${encodeURIComponent(productHandle)}` },
      robots: { index: false, follow: true },
    };
  }
  return buildProductMetadata(product);
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { productHandle } = await params;
  const product = await fetchProduct(productHandle);
  if (!product) notFound();

  const canonical = `${SITE_URL}/product/${encodeURIComponent(product.handle)}`;

  // FAQs may live on the product row (`faqs` JSON) or be absent.
  const faqs = Array.isArray(product.faqs)
    ? product.faqs.filter((f) => f && f.question && f.answer)
    : [];

  const jsonLd = [
    productJsonLd(product),
    breadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: product.category || 'Products', url: product.category ? `/category/${encodeURIComponent(product.category)}` : '/' },
      { name: product.title, url: `/product/${product.handle}` },
    ]),
    faqs.length ? faqJsonLd(faqs) : null,
  ].filter(Boolean);

  const displayPrice = product.price ? `₹${product.price}` : '';
  const originalPrice = product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
    ? `₹${product.compare_at_price}`
    : '';

  return (
    <>
      <JsonLd data={jsonLd} />

      {/*
       * SEO-critical, server-rendered content. Kept visually hidden with
       * `sr-only` semantics so it does not conflict with the (already
       * beautifully-designed) client PDP that hydrates below. Google's
       * crawler sees this in the raw HTML on first fetch — which is the
       * whole point of moving off `force-dynamic` client rendering.
       */}
      <div className="seo-server-content" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        <h1>{product.title}{displayPrice ? ` — ${displayPrice}` : ''}</h1>
        {originalPrice ? <p>Original price: <s>{originalPrice}</s> — now {displayPrice}</p> : null}
        <p>{product.short_description || (product.description ? String(product.description).replace(/<[^>]*>/g, '').slice(0, 300) : '')}</p>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            {product.category ? <li><a href={`/category/${encodeURIComponent(product.category)}`}>{product.category}</a></li> : null}
            <li>{product.title}</li>
          </ol>
        </nav>
        <link rel="canonical" href={canonical} />
      </div>

      <Singleproducts initialProduct={product as any} />
    </>
  );
}
