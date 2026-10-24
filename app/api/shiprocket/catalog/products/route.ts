import { NextResponse } from 'next/server';
import { getLiveProducts } from '@/utils/catalogue';
import { mapProductToShiprocket, parsePaging } from '@/utils/shiprocketCheckout';

// Force dynamic - these routes touch Supabase and Shiprocket at request time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * Catalogue endpoint Shiprocket pulls: GET ?page=1&limit=100
 * Response: { data: { total, products: [...] } } - Shopify-style product objects.
 * Public by design: it exposes exactly what /feed.xml and the storefront already do.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const { from, to } = parsePaging(url.searchParams);
  const { products } = await getLiveProducts(500);
  const sorted = [...products].sort((a, b) => Number(a.id) - Number(b.id));
  const page = sorted.slice(from, to).map((p) => mapProductToShiprocket(p, url.origin));
  return NextResponse.json({ data: { total: sorted.length, products: page } });
}
