import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';
import { getLiveProducts } from '@/utils/catalogue';
import {
  DEFAULT_API_BASE,
  STAGING_API_BASE,
  environmentForBase,
  explainShiprocketError,
  fetchOrderList,
  getShiprocketConfig,
  mapProductToShiprocket,
  pushProductWebhook,
  type ShiprocketConfig,
} from '@/utils/shiprocketCheckout';
import { SETTINGS_KEY, readAdminSettings } from '@/utils/shiprocketRuntime';
import {
  CREDENTIALS_TABLE,
  mergeConfig,
  readStoredCredentials,
  resolveShiprocketConfig,
  validateCredentialInput,
} from '@/utils/shiprocketSettings';
import { encryptSecret, maskSecret } from '@/utils/shiprocketCrypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Admin-only control panel backend for /admin/shiprocket.
 *
 *   GET                                         -> health report (masked hints only, never a secret)
 *   POST {action:'set_enabled', enabled}        -> master kill switch (no redeploy)
 *   POST {action:'set_placement', cart, buy_now}-> offer Shiprocket on cart and/or product-page Buy Now
 *   POST {action:'save_credentials', apiKey, apiSecret, environment, webhookToken?}
 *                                               -> test with Shiprocket FIRST, then store encrypted
 *   POST {action:'test_credentials'}            -> re-run the connection test on what is in use now
 *   POST {action:'clear_credentials'}           -> delete stored credentials (falls back to env)
 *   POST {action:'set_webhook_token', token}    -> protect the order webhook (empty = remove)
 *   POST {action:'sync_catalog'}                -> push every live product to Shiprocket
 */

async function testConnection(cfg: ShiprocketConfig): Promise<{ ok: boolean; detail: string }> {
  if (!cfg.configured) return { ok: false, detail: 'No API key / secret saved yet.' };
  const end = new Date();
  const r = await fetchOrderList(cfg, {
    startDate: new Date(end.getTime() - 3600_000).toISOString(),
    endDate: end.toISOString(),
    status: 'SUCCESS',
    limit: 1,
    page: 0,
  });
  return r.ok
    ? { ok: true, detail: 'Shiprocket accepted the API key and secret.' }
    : { ok: false, detail: `${explainShiprocketError(r.status, r.error)} (HTTP ${r.status ?? 'no response'})` };
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const supabase = createServerSupabase();
  const envCfg = getShiprocketConfig();
  const stored = await readStoredCredentials(supabase);
  const cfg = mergeConfig(envCfg, stored);
  const settings = await readAdminSettings(supabase);
  const site = (process.env.NEXT_PUBLIC_SITE_ORIGIN || new URL(req.url).origin).replace(/\/$/, '');

  // Detect whether the credentials table has been created (migration run).
  const tableProbe = await supabase.from(CREDENTIALS_TABLE).select('id').limit(1);
  const tableReady = !tableProbe.error;

  const credentials = await testConnection(cfg);
  const { products, source } = await getLiveProducts(500);
  const live = cfg.configured && cfg.enabled && settings.enabled;

  const orders = await supabase
    .from('orders')
    .select('id, order_id, total_amount, payment_method, created_at')
    .like('txn_id', 'SR-%')
    .order('created_at', { ascending: false })
    .limit(5);

  const encKeyDedicated = !!(process.env.SHIPROCKET_ENCRYPTION_KEY || '').trim();

  return NextResponse.json({
    success: true,
    primaryCheckout: live ? 'shiprocket' : 'native',
    environment: environmentForBase(cfg.apiBase),
    credentialSource: cfg.source || 'none',
    credentialsTableReady: tableReady,
    storedCredentialsUnreadable: !!stored?.undecryptable,
    keys: {
      apiKey: maskSecret(cfg.apiKey),
      apiSecret: cfg.apiSecret ? `set (${cfg.apiSecret.length} chars)` : 'not set',
      webhookToken: cfg.webhookToken ? 'set' : 'not set (webhook is open: anyone can trigger a lookup, though never create an order)',
    },
    env: {
      SHIPROCKET_CHECKOUT_API_KEY: maskSecret(envCfg.apiKey),
      SHIPROCKET_CHECKOUT_API_SECRET: envCfg.apiSecret ? `set (${envCfg.apiSecret.length} chars)` : 'not set',
      SHIPROCKET_CHECKOUT_API_BASE: envCfg.apiBase,
      SHIPROCKET_CHECKOUT_ENABLED: envCfg.killed ? 'false (kill switch ON)' : 'not set to false',
      SHIPROCKET_ENCRYPTION_KEY: encKeyDedicated ? 'set' : 'not set (JWT_SECRET is used instead; set a dedicated one)',
      CRON_SECRET: process.env.CRON_SECRET ? 'set' : 'missing - the failsafe cron cannot run',
      NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN || 'not set (falls back to request origin)',
      EASEBUZZ_KEY: process.env.EASEBUZZ_KEY ? 'set (fallback checkout ready)' : 'missing - fallback checkout would fail',
      EASEBUZZ_SALT: process.env.EASEBUZZ_SALT ? 'set' : 'missing',
    },
    adminEnabled: settings.enabled,
    placement: { cart: settings.cart, buyNow: settings.buyNow },
    credentials,
    catalogue: { products: products.length, source },
    urlsToRegister: {
      products: `${site}/api/shiprocket/catalog/products`,
      collections: `${site}/api/shiprocket/catalog/collections`,
      collectionProducts: `${site}/api/shiprocket/catalog/collection-products`,
      orderWebhook: `${site}/api/shiprocket/webhook/order`,
      redirectUrl: `${site}/shiprocket/return`,
      domain: new URL(site).host,
    },
    recentShiprocketOrders: orders.data || [],
  });
}

async function writeSettings(supabase: any, patch: Record<string, unknown>) {
  const current = await supabase.from('site_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  const value = { ...(current.data?.value && typeof current.data.value === 'object' ? current.data.value : {}), ...patch };
  return supabase.from('site_settings').upsert({ key: SETTINGS_KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

const SETTINGS_TABLE_HINT = 'Run supabase/migrations/SHIPROCKET_ADMIN_CONTROL.sql in the Supabase SQL editor first.';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body: any = await req.json().catch(() => ({}));
  const supabase = createServerSupabase();

  if (body.action === 'set_enabled') {
    const { error } = await writeSettings(supabase, { enabled: body.enabled !== false });
    if (error) return NextResponse.json({ success: false, error: `Could not save (${error.message}). ${SETTINGS_TABLE_HINT}` }, { status: 500 });
    return NextResponse.json({ success: true, adminEnabled: body.enabled !== false });
  }

  if (body.action === 'set_placement') {
    const patch: Record<string, boolean> = {};
    if (typeof body.cart === 'boolean') patch.cart = body.cart;
    if (typeof body.buy_now === 'boolean') patch.buy_now = body.buy_now;
    if (!Object.keys(patch).length) return NextResponse.json({ success: false, error: 'Nothing to change.' }, { status: 400 });
    const { error } = await writeSettings(supabase, patch);
    if (error) return NextResponse.json({ success: false, error: `Could not save (${error.message}). ${SETTINGS_TABLE_HINT}` }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === 'save_credentials') {
    const problem = validateCredentialInput(body.apiKey, body.apiSecret);
    if (problem) return NextResponse.json({ success: false, error: problem }, { status: 400 });
    const environment = body.environment === 'staging' ? 'staging' : 'production';
    const candidate: ShiprocketConfig = {
      enabled: true,
      configured: true,
      killed: false,
      apiKey: String(body.apiKey).trim(),
      apiSecret: String(body.apiSecret).trim(),
      apiBase: environment === 'staging' ? STAGING_API_BASE : DEFAULT_API_BASE,
    };

    // Test BEFORE saving so a typo can never replace working credentials.
    const test = await testConnection(candidate);
    if (!test.ok) {
      return NextResponse.json({ success: false, error: `Not saved. ${test.detail}` }, { status: 422 });
    }

    let enc: { key: string; secret: string; token: string | null };
    try {
      const token = typeof body.webhookToken === 'string' ? body.webhookToken.trim() : '';
      enc = { key: encryptSecret(candidate.apiKey), secret: encryptSecret(candidate.apiSecret), token: token ? encryptSecret(token) : null };
    } catch (e) {
      return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }

    const row: Record<string, unknown> = {
      id: 1,
      api_key_enc: enc.key,
      api_secret_enc: enc.secret,
      environment,
      updated_at: new Date().toISOString(),
    };
    if (enc.token) row.webhook_token_enc = enc.token;
    const { error } = await supabase.from(CREDENTIALS_TABLE).upsert(row, { onConflict: 'id' });
    if (error) {
      return NextResponse.json({ success: false, error: `Connected to Shiprocket, but could not save (${error.message}). ${SETTINGS_TABLE_HINT}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, detail: `Saved. ${test.detail}`, environment });
  }

  if (body.action === 'test_credentials') {
    const cfg = await resolveShiprocketConfig(supabase);
    return NextResponse.json({ success: true, credentials: await testConnection(cfg) });
  }

  if (body.action === 'clear_credentials') {
    const { error } = await supabase.from(CREDENTIALS_TABLE).delete().eq('id', 1);
    if (error) return NextResponse.json({ success: false, error: `Could not clear (${error.message}).` }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === 'set_webhook_token') {
    const token = String(body.token ?? '').trim();
    if (token && token.length < 16) return NextResponse.json({ success: false, error: 'Use at least 16 characters for the webhook token.' }, { status: 400 });
    const existing = await supabase.from(CREDENTIALS_TABLE).select('id').eq('id', 1).maybeSingle();
    if (existing.error) return NextResponse.json({ success: false, error: `${existing.error.message}. ${SETTINGS_TABLE_HINT}` }, { status: 500 });
    let enc: string | null = null;
    try {
      enc = token ? encryptSecret(token) : null;
    } catch (e) {
      return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
    const { error } = existing.data
      ? await supabase.from(CREDENTIALS_TABLE).update({ webhook_token_enc: enc, updated_at: new Date().toISOString() }).eq('id', 1)
      : await supabase.from(CREDENTIALS_TABLE).insert({ id: 1, webhook_token_enc: enc, environment: 'production' });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === 'sync_catalog') {
    const cfg = await resolveShiprocketConfig(supabase);
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
