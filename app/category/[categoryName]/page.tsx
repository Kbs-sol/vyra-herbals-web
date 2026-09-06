import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/utils/supabaseClient';
import {
  breadcrumbJsonLd,
  buildCategoryMetadata,
  categorySlugToName,
  itemListJsonLd,
  SITE_URL,
} from '@/utils/seo';
import JsonLd from '@/Components/Shared/JsonLd';
import Category from '@/Pages/Category';

/**
 * Category listing — server component wrapper.
 *
 * Two big wins the old client-only version could not deliver:
 *   1) Per-category <title> and <meta description> tuned to the search intent
 *      identified in the audit (`Herbal Hair Oil for Hair Fall & Growth …`).
 *      /category/hair-oil already sits at position ~4.9 in Google — a decent
 *      title + description alone is expected to lift CTR from 0.9% → ~3%.
 *   2) `ItemList` + `BreadcrumbList` JSON-LD so Google shows category-level
 *      rich results (multi-image carousels are eligible).
 *
 * The heavy filter / sort UI is still a client island via <Category />.
 */

export const revalidate = 300;

type Params = { categoryName: string };

interface CategoryDataRow {
  id: string | number;
  handle: string;
  title: string;
  image_url: string | null;
  price: number | string | null;
  category: string | null;
}

async function fetchCategory(rawSlug: string): Promise<{
  name: string;
  slug: string;
  products: CategoryDataRow[];
} | null> {
  try {
    const decoded = decodeURIComponent(rawSlug);
    const humanised = categorySlugToName(decoded);
    const supabase = createServerSupabase();

    // Case-insensitive category match. Some products store `Hair Oil`,
    // some `hair oil`, some the URL-safe `hair-oil` — support all.
    const patterns = [decoded, humanised, humanised.replace(/\s+/g, '-')];
    const orClauses = patterns.map((p) => `category.ilike.${p}`).join(',');

    const { data, error } = await supabase
      .from('products')
      .select('id, handle, title, image_url, price, category')
      .or(orClauses)
      .or('status.eq.1,status.eq.active,status.is.null')
      .limit(200);

    if (error) {
      console.error('[category] fetch failed:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    // Use whichever spelling the DB actually stored for the human name.
    const displayName = (data.find((r) => r.category)?.category as string) || humanised;
    return { name: displayName, slug: rawSlug, products: data as CategoryDataRow[] };
  } catch (e) {
    console.error('[category] unexpected error:', (e as Error).message);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { categoryName } = await params;
  const result = await fetchCategory(categoryName);
  const name = result?.name || categorySlugToName(categoryName);
  return buildCategoryMetadata({
    name,
    slug: categoryName,
    description: null,
    image_url: result?.products?.[0]?.image_url || null,
    productCount: result?.products?.length,
  });
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { categoryName } = await params;
  const result = await fetchCategory(categoryName);
  if (!result) notFound();

  const canonical = `${SITE_URL}/category/${encodeURIComponent(categoryName)}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: result.name, url: `/category/${encodeURIComponent(categoryName)}` },
    ]),
    itemListJsonLd(result.products.map((p) => ({ handle: p.handle, title: p.title, image_url: p.image_url, price: p.price }))),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Server-rendered SEO block — hidden from view, visible to crawlers */}
      <div className="seo-server-content" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        <h1>{result.name} — Herbal Care</h1>
        <p>Browse our {result.name.toLowerCase()} collection: {result.products.length} product{result.products.length === 1 ? '' : 's'} formulated with Ayurvedic herbs, chemical-free, ISO 9001:2015 & GMP certified.</p>
        <ul>
          {result.products.slice(0, 20).map((p) => (
            <li key={p.id}>
              <a href={`/product/${encodeURIComponent(p.handle)}`}>{p.title}</a>
              {p.price ? <span> — ₹{p.price}</span> : null}
            </li>
          ))}
        </ul>
        <link rel="canonical" href={canonical} />
      </div>

      <Category />
    </>
  );
}
