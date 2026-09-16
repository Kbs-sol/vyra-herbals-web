import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

// POST body: { items: [{product_id: number, quantity: number}] }
export async function POST(req: Request) {
  const body = await req.json();
  const items: { product_id: number; quantity: number }[] = body.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const db = getSupabaseAdmin();
  const productIds = items.map(i => i.product_id);

  const { data: products } = await db
    .from('products')
    .select('id, price, stock_quantity, quantity, status')
    .in('id', productIds);

  const productMap = new Map((products || []).map((p: any) => [p.id, p]));

  const results = items.map(item => {
    const product = productMap.get(item.product_id);
    if (!product) return { product_id: item.product_id, status: 'not_found' };
    if (product.status === 0) return { product_id: item.product_id, status: 'unavailable' };
    const hasStockLimit = product.stock_quantity !== null && product.stock_quantity !== undefined;
    const stock = hasStockLimit ? (product.stock_quantity ?? product.quantity) : null;
    if (hasStockLimit && stock !== null && stock < 1) {
      return { product_id: item.product_id, status: 'out_of_stock', available: 0 };
    }
    if (hasStockLimit && stock !== null && stock < item.quantity) {
      return { product_id: item.product_id, status: 'insufficient_stock', available: stock, requested: item.quantity };
    }
    return { product_id: item.product_id, status: 'ok', available: stock ?? 999, price: product.price };
  });

  const allOk = results.every(r => r.status === 'ok');
  return NextResponse.json({ ok: allOk, results });
}
