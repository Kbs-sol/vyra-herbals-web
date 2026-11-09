import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { isSuccessfulOrderStatus } from '@/utils/orderStatus';
import { FAMILIES, getFamilyForProductId } from '@/utils/variantFamilies';
import { clientIp, rateLimit } from '@/utils/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const WINDOW_DAYS = 30;
const CACHE_MS = 10 * 60 * 1000;

type Payload = {
  windowDays: number;
  updatedAt: string;
  products: Record<string, number>;
  families: Record<string, number>;
  unavailable?: boolean;
};

let cache: { at: number; data: Payload } | null = null;

async function compute(): Promise<Payload> {
  const supabase = createServerSupabase();
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  const { data, error } = await supabase
    .from('orders')
    .select('items,status,created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw error;

  const products: Record<string, number> = {};
  const families: Record<string, number> = {};

  for (const order of data || []) {
    if (!isSuccessfulOrderStatus((order as any).status)) continue;
    let items: any = (order as any).items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    if (!Array.isArray(items)) continue;
    const seenProducts = new Set<string>();
    const seenFamilies = new Set<string>();
    for (const it of items) {
      const id = Number(it?.id ?? it?.product_id);
      if (!Number.isFinite(id)) continue;
      seenProducts.add(String(id));
      const fam = getFamilyForProductId(id);
      if (fam) seenFamilies.add(fam.key);
    }
    seenProducts.forEach((k) => (products[k] = (products[k] || 0) + 1));
    seenFamilies.forEach((k) => (families[k] = (families[k] || 0) + 1));
  }
  // make sure every family key exists for the client
  FAMILIES.forEach((f) => { if (!(f.key in families)) families[f.key] = 0; });

  return { windowDays: WINDOW_DAYS, updatedAt: new Date().toISOString(), products, families };
}

export async function GET(req: Request) {
  const rl = rateLimit(`order-counts:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } });
  }
  const headers = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' };
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data, { headers });
  }
  try {
    const data = await compute();
    cache = { at: Date.now(), data };
    return NextResponse.json(data, { headers });
  } catch (err) {
    console.error('order-counts error:', (err as Error).message);
    if (cache) return NextResponse.json(cache.data, { headers });
    return NextResponse.json(
      { windowDays: WINDOW_DAYS, updatedAt: new Date().toISOString(), products: {}, families: {}, unavailable: true } satisfies Payload,
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
