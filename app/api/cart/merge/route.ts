import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser } from '@/utils/apiAuth';

export const runtime = 'nodejs';
const COOKIE_NAME = 'anon_device_id';
const MAX_QTY = 10;

export async function POST(req: Request) {
  // Verify auth
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const user = auth.user;

  const cookieStore = await cookies();
  const deviceId = cookieStore.get(COOKIE_NAME)?.value;
  if (!deviceId) return NextResponse.json({ ok: true, merged: 0 }); // No anon cart

  const db = getSupabaseAdmin();

  // Get anon cart
  const { data: anonCart } = await db
    .from('anon_carts')
    .select('id, items')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (!anonCart || !Array.isArray(anonCart.items) || anonCart.items.length === 0) {
    return NextResponse.json({ ok: true, merged: 0 });
  }

  // Get existing authenticated cart
  const { data: authCartRows } = await db
    .from('cart')
    .select('product_id, quantity')
    .eq('user_id', user.id);

  const existingQty = new Map<string, number>();
  (authCartRows || []).forEach((row: any) => {
    existingQty.set(String(row.product_id), Number(row.quantity) || 0);
  });

  // Build upsert rows — combine quantities, cap at MAX_QTY
  const upsertRows = anonCart.items.map((item: any) => {
    const existing = existingQty.get(String(item.product_id)) || 0;
    const combined = Math.max(existing, Math.min(MAX_QTY, existing + item.quantity));
    return { user_id: user.id, product_id: item.product_id, quantity: combined };
  });

  const { error: upsertError } = await db
    .from('cart')
    .upsert(upsertRows, { onConflict: 'user_id,product_id' });

  if (upsertError) {
    console.error('[cart-merge] upsert error:', upsertError);
    return NextResponse.json({ error: 'Merge failed' }, { status: 500 });
  }

  // Delete anon cart row (merge complete)
  await db.from('anon_carts').delete().eq('device_id', deviceId);

  // Clear the cookie
  const response = NextResponse.json({ ok: true, merged: upsertRows.length });
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}
