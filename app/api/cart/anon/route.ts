import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
const COOKIE_NAME = 'anon_device_id';
const MAX_QTY = 10;
const EXPIRE_DAYS = 90;

async function getDeviceId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

async function getCart(db: any, deviceId: string) {
  const { data, error } = await db
    .from('anon_carts')
    .select('id, items')
    .eq('device_id', deviceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function extendExpiry() {
  const expires = new Date();
  expires.setDate(expires.getDate() + EXPIRE_DAYS);
  return { last_updated: new Date().toISOString(), expires_at: expires.toISOString() };
}

// GET — fetch current cart with live prices
export async function GET() {
  const deviceId = await getDeviceId();
  if (!deviceId) return NextResponse.json({ items: [] });

  const db = getSupabaseAdmin();
  const cart = await getCart(db, deviceId);
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Re-read current product data to detect staleness and OOS
  const productIds = cart.items.map((i: any) => i.product_id);
  const { data: products } = await db
    .from('products')
    .select('id, title, price, image_url, handle, stock_quantity, quantity, status')
    .in('id', productIds);

  const productMap = new Map((products || []).map((p: any) => [p.id, p]));

  const enriched = cart.items.map((item: any) => {
    const product = productMap.get(item.product_id);
    if (!product) return null; // Product deleted
    const hasStockLimit = product.stock_quantity !== null && product.stock_quantity !== undefined;
    const currentStock = hasStockLimit ? (product.stock_quantity ?? product.quantity ?? 0) : null;
    const isOutOfStock = hasStockLimit && currentStock !== null && currentStock < 1;
    return {
      ...item,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
      handle: product.handle,
      price_updated: product.price !== item.price_at_add,
      out_of_stock: isOutOfStock,
      stock_quantity: currentStock,
    };
  }).filter(Boolean);

  return NextResponse.json({ items: enriched });
}

// POST — add item to cart
export async function POST(req: Request) {
  const deviceId = await getDeviceId();
  if (!deviceId) return NextResponse.json({ error: 'No device ID. Call /api/cart/anon/init first.' }, { status: 400 });

  const body = await req.json();
  const productId = Number(body.product_id);
  const qty = Math.max(1, Math.min(MAX_QTY, Number(body.quantity) || 1));
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const db = getSupabaseAdmin();

  // Fetch current product — products have status: null or 1 for active
  const { data: product } = await db
    .from('products')
    .select('id, title, price, image_url, handle, stock_quantity, quantity, status')
    .eq('id', productId)
    .or('status.eq.1,status.is.null') // Active products
    .maybeSingle();

  if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
  const hasStockLimit = product.stock_quantity !== null && product.stock_quantity !== undefined;
  const currentStock = hasStockLimit ? (product.stock_quantity ?? product.quantity ?? 0) : null;
  if (hasStockLimit && currentStock !== null && currentStock < 1) {
    return NextResponse.json({ error: 'out_of_stock' }, { status: 409 });
  }

  const cart = await getCart(db, deviceId);
  const items: any[] = Array.isArray(cart?.items) ? [...cart.items] : [];
  const existingIdx = items.findIndex((i: any) => i.product_id === productId);

  if (existingIdx > -1) {
    const existing = items[existingIdx];
    const newQty = Math.min(MAX_QTY, existing.quantity + qty);
    if (hasStockLimit && currentStock !== null && newQty > currentStock) {
      return NextResponse.json({ error: 'insufficient_stock', available: currentStock }, { status: 409 });
    }
    items[existingIdx] = {
      ...existing,
      quantity: newQty,
      price_updated: product.price !== existing.price_at_add,
    };
  } else {
    if (hasStockLimit && currentStock !== null && qty > currentStock) {
      return NextResponse.json({ error: 'insufficient_stock', available: currentStock }, { status: 409 });
    }
    items.push({
      product_id: productId,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
      handle: product.handle,
      quantity: qty,
      price_at_add: product.price,
      price_updated: false,
      stock_quantity: currentStock,
    });
  }

  const expiryData = extendExpiry();
  if (cart) {
    await db.from('anon_carts').update({ items, ...expiryData }).eq('device_id', deviceId);
  } else {
    await db.from('anon_carts').insert({ device_id: deviceId, items, ...expiryData });
  }

  return NextResponse.json({ ok: true, item_count: items.length });
}

// PATCH — update quantity
export async function PATCH(req: Request) {
  const deviceId = await getDeviceId();
  if (!deviceId) return NextResponse.json({ error: 'No device ID' }, { status: 400 });

  const body = await req.json();
  const productId = Number(body.product_id);
  const qty = Number(body.quantity);
  if (!productId || isNaN(qty)) return NextResponse.json({ error: 'product_id and quantity required' }, { status: 400 });

  const db = getSupabaseAdmin();
  const cart = await getCart(db, deviceId);
  if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 });

  let items: any[] = Array.isArray(cart.items) ? [...cart.items] : [];

  if (qty <= 0) {
    items = items.filter((i: any) => i.product_id !== productId);
  } else {
    const idx = items.findIndex((i: any) => i.product_id === productId);
    if (idx === -1) return NextResponse.json({ error: 'Item not in cart' }, { status: 404 });
    items[idx] = { ...items[idx], quantity: Math.min(MAX_QTY, qty) };
  }

  await db.from('anon_carts').update({ items, ...extendExpiry() }).eq('device_id', deviceId);
  return NextResponse.json({ ok: true, item_count: items.length });
}

// DELETE — remove item
export async function DELETE(req: Request) {
  const deviceId = await getDeviceId();
  if (!deviceId) return NextResponse.json({ error: 'No device ID' }, { status: 400 });

  const body = await req.json();
  const productId = Number(body.product_id);
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const db = getSupabaseAdmin();
  const cart = await getCart(db, deviceId);
  if (!cart) return NextResponse.json({ ok: true }); // Idempotent

  const items = (cart.items || []).filter((i: any) => i.product_id !== productId);
  await db.from('anon_carts').update({ items, ...extendExpiry() }).eq('device_id', deviceId);
  return NextResponse.json({ ok: true, item_count: items.length });
}
