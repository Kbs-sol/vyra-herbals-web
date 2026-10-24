import { NextResponse } from 'next/server';
import { parsePaging } from '@/utils/shiprocketCheckout';
import { loadCollections } from '@/utils/shiprocketCatalogue';

// Force dynamic - these routes touch Supabase and Shiprocket at request time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** GET ?page=1&limit=100 -> { data: { total, collections: [...] } } */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const { from, to } = parsePaging(url.searchParams);
  const all = await loadCollections(url.origin);
  const page = all.slice(from, to).map(({ _key, ...c }) => c);
  return NextResponse.json({ data: { total: all.length, collections: page } });
}
