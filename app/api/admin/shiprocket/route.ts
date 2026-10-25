import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';
import { getLiveProducts } from '@/utils/catalogue';
import {
  environmentForBase,
  fetchOrderList,
  getShiprocketConfig,
  mapProductToShiprocket,
  pushProductWebhook,
} from '@/utils/shiprocketCheckout';
import { SETTINGS_KEY, readAdminSwitch } from '@/utils/shiprocketRuntime';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 60;

const mask = (v: string) => (v ? `${v.slice(0, 3)}…${v.slice(-2)} (${v.length} chars)` : 'missing');

/**
 * Admin-only control panel backend for /admin/shiprocket.
 *   GET            -> health report (never returns a secret, only masked hints)
 *   POST {action:'set_enabled', enabled}  -> instant kill switch (no redeploy)
 *   POST {action:'sync_catalog'}          -> push every live product to Shiprocket
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const cfg = getShiprocketConfig();
  const supabase = createServerSupabase();
  const adminDisabled = await readAdminSwitch(supabase);
  const site = (process.env.NEXT_PUBLIC_SITE_ORIGIN || new URL(req.url).origin).replace(/\/$/, '');

  // Live credential check: ask Shiprocket for a (usually empty) order list.
  let credentials: { ok: boolean; detail: string } = { ok: false, detail: 'Not configured' };
  if (cfg.configured) {
    const end = new Date();
    const r = await fetchOrderList(cfg, {
      startDate: new Date(end.getTime() - 3600_000).toISOString(),
      endDate: end.toISOString(),
      status: 'SUCCESS',
      limit: 1,
      page: 0,
    });
    credentials = r.ok
      ? { ok: true, detail: 'Shiprocket accepted the API key and secret.' }
      : { ok: false, detail: `Shiprocket rejected the call (${r.status ?? 'no response'}): ${r.error}` };
  }

  const { products, source } = await getLiveProducts(500);
  const live = !cfg.configured ? false : cfg.enabled && !adminDisabled;

  const orders = await supabase
    .from('orders')
    .select('id, order_id, total_amount, payment_method, created_at')
    .like('txn_id', 'SR-%')
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    success: true,
    primaryCheckout: live ? 'shiprocket' : 'native',
    environment: environmentForBase(cfg.apiBase),
    env: {
      SHIPROCKET_CHECKOUT_API_KEY: mask(cfg.apiKey),
      SHIPROCKET_CHECKOUT_API_SECRET: cfg.apiSecret ? `set (${cfg.apiSecret.length} chars)` : 'missing',
      SHIPROCKET_CHECKOUT_API_BASE: cfg.apiBase,
      SHIPROCKET_CHECKOUT_ENABLED: cfg.killed ? 'false (kill switch ON)' : 'not set to false',
      CRON_SECRET: process.env.CRON_SECRET ? 'set' : 'missing - the failsafe cron cannot run',
      NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN || 'not set (falls back to request origin)',
      EASEBUZZ_KEY: process.env.EASEBUZZ_KEY ? 'set (fallback checkout ready)' : 'missing - fallback checkout would fail',
      EASEBUZZ_SALT: process.env.EASEBUZZ_SALT ? 'set' : 'missing',
    },
    adminEnabled: !adminDisabled,
    credentials,
    catalogue: { products: products.length, source },
    urlsToRegister: {
      products: `${site}/api/shiprocket/catalog/products`,
      collections: `${site}/api/shiprocket/catalog/collections`,
      collectionProducts: `${site}/api/shiprocket/catalog/collection-products`,
      orderWebhook: `${site}/api/shiprocket/webhook/order`,
      domain: new URL(site).host,
    },
    recentShiprocketOrders: orders.data || [],
  });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body: any = await req.json().catch(() => ({}));
  const supabase = createServerSupabase();

  if (body.action === 'set_enabled') {
    const enabled = body.enabled !== false;
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: SETTINGS_KEY, value: { enabled }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) {
      return NextResponse.json(
        { success: false, error: `Could not save (${error.message}). Run SITE_SETTINGS_AND_STATUS_FIX.sql if the site_settings table is missing.` },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, adminEnabled: enabled });
  }

  if (body.action === 'sync_catalog') {
    const cfg = getShiprocketConfig();
    if (!cfg.configured) return NextResponse.json({ success: false, error: 'Shiprocket keys are not set.' }, { status: 400 });
    const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || new URL(req.url).origin).replace(/\/$/, '');
    const { products } = await getLiveProducts(500);
    const failures: Array<{ id: number; error?: string }> = [];
    let pushed = 0;
    const deadline = Date.now() + 50_000;
    for (const p of products) {
      if (Date.now() > deadline) break;
      const r = await pushProductWebhook(cfg, mapProductToShiprocket(p, origin) as any);
      if (r.ok) pushed++;
      else failures.push({ id: Number(p.id), error: r.error });
    }
    return NextResponse.json({ success: failures.length === 0, total: products.length, pushed, failures: failures.slice(0, 10) });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
