import { NextResponse } from 'next/server';
import { getLiveProducts } from '@/utils/catalogue';
import { mapProductToShiprocket, parsePaging } from '@/utils/shiprocketCheckout';
import { loadCollections } from '@/utils/shiprocketCatalogue';

// Force dynamic - these routes touch Supabase and Shiprocket at request time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** GET ?collection_id=1234&page=1&limit=100 -> { data: { total, products: [...] } } */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const { from, to } = parsePaging(url.searchParams);
  const wanted = Number(url.searchParams.get('collection_id'));
  const collections = await loadCollections(url.origin);
  const collection = collections.find((c) => c.id === wanted);
  if (!collection) return NextResponse.json({ data: { total: 0, products: [] } });

  const { products } = await getLiveProducts(500);
  const inCollection = products
    .filter((p) => String(p.category || '').trim().toLowerCase() === collection._key)
    .sort((a, b) => Number(a.id) - Number(b.id));
  return NextResponse.json({
    data: { total: inCollection.length, products: inCollection.slice(from, to).map((p) => mapProductToShiprocket(p, url.origin)) },
  });
}
