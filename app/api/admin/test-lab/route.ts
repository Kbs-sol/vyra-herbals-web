import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/utils/adminAuth';

export const runtime = 'nodejs';

// Test products that are pre-seeded for safe testing.
// category = '__test__' is ALWAYS filtered from public shop APIs.
const TEST_PRODUCT_SEEDS = [
  {
    handle: 'vyra-test-product-a',
    title: '🧪 Test Product A (₹1)',
    description: 'Internal test product. Never visible in the public shop.',
    price: 1,
    regular_price: 249,
    category: '__test__',
    stock_quantity: 9999,
    quantity: 9999,
    status: 0,           // OFF by default (draft/hidden)
    brand: 'Vyra Herbals',
    image_url: 'https://placehold.co/400x400/e8f5e9/2e7d32?text=Test+A',
    images: ['https://placehold.co/400x400/e8f5e9/2e7d32?text=Test+A'],
    sku: 'vyra-test-product-a',
    is_test_product: true,
    keywords: 'test,internal',
    view_count: 0,
    ordered_count_30_days: 0,
    featured_order: 99999,
  },
  {
    handle: 'vyra-test-product-b',
    title: '🧪 Test Product B (₹1)',
    description: 'Internal test product. Never visible in the public shop.',
    price: 1,
    regular_price: 499,
    category: '__test__',
    stock_quantity: 9999,
    quantity: 9999,
    status: 0,
    brand: 'Vyra Herbals',
    image_url: 'https://placehold.co/400x400/e3f2fd/1565c0?text=Test+B',
    images: ['https://placehold.co/400x400/e3f2fd/1565c0?text=Test+B'],
    sku: 'vyra-test-product-b',
    is_test_product: true,
    keywords: 'test,internal',
    view_count: 0,
    ordered_count_30_days: 0,
    featured_order: 99999,
  },
  {
    handle: 'vyra-test-cod',
    title: '🧪 Test COD Product (₹1)',
    description: 'Internal test product for Cash on Delivery flow testing.',
    price: 1,
    regular_price: 299,
    category: '__test__',
    stock_quantity: 9999,
    quantity: 9999,
    status: 0,
    brand: 'Vyra Herbals',
    image_url: 'https://placehold.co/400x400/fff3e0/e65100?text=COD+Test',
    images: ['https://placehold.co/400x400/fff3e0/e65100?text=COD+Test'],
    sku: 'vyra-test-cod',
    is_test_product: true,
    keywords: 'test,cod,internal',
    view_count: 0,
    ordered_count_30_days: 0,
    featured_order: 99999,
  },
];

// GET — return current test lab status
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const db = getSupabaseAdmin();
  const { data: testProducts } = await db
    .from('products')
    .select('id, handle, title, price, status, stock_quantity, category')
    .eq('category', '__test__')
    .order('id', { ascending: true });

  const { data: testOrders } = await db
    .from('orders')
    .select('id, order_id, status, total_amount, payment_method, created_at, source')
    .eq('source', 'test')
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    success: true,
    test_products: testProducts || [],
    test_orders: testOrders || [],
  });
}

// POST — actions: seed | toggle | create_order | cleanup | cleanup_orders
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const { action } = body;
  const db = getSupabaseAdmin();

  // ── SEED ─────────────────────────────────────────────────────────────────
  if (action === 'seed') {
    const results: string[] = [];

    for (const seed of TEST_PRODUCT_SEEDS) {
      const { data: existing } = await db
        .from('products')
        .select('id')
        .eq('handle', seed.handle)
        .maybeSingle();

      if (existing) {
        results.push(`⚠️ Already exists: ${seed.title}`);
      } else {
        const { error } = await db.from('products').insert({
          ...seed,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) {
          results.push(`❌ Failed to seed ${seed.title}: ${error.message}`);
        } else {
          results.push(`✅ Seeded: ${seed.title}`);
        }
      }
    }

    return NextResponse.json({ success: true, results });
  }

  // ── TOGGLE (activate / deactivate all test products) ─────────────────────
  if (action === 'toggle') {
    const { active } = body; // true = set status=1, false = set status=0
    const newStatus = active ? 1 : 0;

    const { error } = await db
      .from('products')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('category', '__test__');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: active
        ? '✅ Test products are now LIVE — visible on shop and cart.'
        : '✅ Test products are now HIDDEN — safe, not visible to customers.',
    });
  }

  // ── TOGGLE SINGLE ─────────────────────────────────────────────────────────
  if (action === 'toggle_one') {
    const { product_id, active } = body;
    if (!product_id) return NextResponse.json({ success: false, error: 'product_id required' }, { status: 400 });

    const { error } = await db
      .from('products')
      .update({ status: active ? 1 : 0, updated_at: new Date().toISOString() })
      .eq('id', product_id)
      .eq('category', '__test__'); // safety: only allow toggling test products

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── CREATE TEST ORDER ─────────────────────────────────────────────────────
  if (action === 'create_order') {
    const { payment_method = 'online', product_id } = body;

    // Get a test product to attach to the order
    let testProduct: any = null;
    if (product_id) {
      const { data } = await db
        .from('products')
        .select('id, title, price, image_url')
        .eq('id', product_id)
        .eq('category', '__test__')
        .maybeSingle();
      testProduct = data;
    }
    if (!testProduct) {
      const { data } = await db
        .from('products')
        .select('id, title, price, image_url')
        .eq('category', '__test__')
        .limit(1)
        .maybeSingle();
      testProduct = data;
    }
    if (!testProduct) {
      return NextResponse.json({ success: false, error: 'No test products found. Seed them first.' }, { status: 400 });
    }

    const orderId = `TEST-${Date.now()}`;
    const totalAmount = testProduct.price;

    const orderPayload: any = {
      order_id: orderId,
      status: payment_method === 'cod' ? 'Order Confirmed' : 'Payment Received',
      payment_method,
      payment_status: payment_method === 'cod' ? 'cod_pending' : 'paid',
      total_amount: totalAmount,
      source: 'test',
      items: [
        {
          product_id: testProduct.id,
          title: testProduct.title,
          quantity: 1,
          price: testProduct.price,
          image_url: testProduct.image_url,
        },
      ],
      shipping_address: 'Test Address, Test Lane, Test City, TS 000000',
      shipping_data: {
        name: 'Test Customer',
        phone: '9999999999',
        email: 'test@vyraherbals.com',
        address: 'Test Lane',
        city: 'Test City',
        state: 'Test State',
        pincode: '000000',
      },
      delivery_status: 'Test Order - No Shipment Created',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: order, error } = await db
      .from('orders')
      .insert(orderPayload)
      .select('id, order_id')
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      order_id: order.order_id,
      db_id: order.id,
      message: `✅ Test order ${order.order_id} created. No real payment or shipment was made.`,
    });
  }

  // ── CLEANUP ORDERS ────────────────────────────────────────────────────────
  if (action === 'cleanup_orders') {
    const { error } = await db.from('orders').delete().eq('source', 'test');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: '🗑️ All test orders deleted.' });
  }

  // ── CLEANUP ALL (products + orders) ──────────────────────────────────────
  if (action === 'cleanup_all') {
    await db.from('orders').delete().eq('source', 'test');
    await db.from('products').delete().eq('category', '__test__');
    return NextResponse.json({ success: true, message: '🗑️ All test data removed.' });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
