import { getShiprocketConfig, uiUrlsFor, type ShiprocketConfig, type ShiprocketEnvironment } from './shiprocketCheckout';
import { mergeConfig, readStoredCredentials } from './shiprocketSettings';

/**
 * Runtime (per request) decision: "should the website offer Shiprocket right now?"
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 *
 * Shiprocket is the DEFAULT checkout as soon as its API key + secret exist.
 * Two independent kill switches send everyone to the native Easebuzz / COD
 * checkout instead, and neither one stops paid Shiprocket orders from being
 * recorded (webhook / finalize / cron never consult the switches):
 *
 *   1. env  SHIPROCKET_CHECKOUT_ENABLED=false           (needs a redeploy)
 *   2. DB   site_settings.key = 'shiprocket_checkout'   value {"enabled": false}
 *           (instant, flipped from /admin/shiprocket - no redeploy)
 *
 * The same DB row also carries two placement switches, {"cart": bool, "buy_now": bool},
 * so the owner can offer Shiprocket on the cart only, or on product-page Buy Now
 * only. Missing = on. Credentials may come from the admin page (encrypted table)
 * or from env; see shiprocketSettings.
 *
 * Any failure reading the DB switch fails SAFE toward Shiprocket staying as
 * configured, because the browser has its own fallback to the native checkout.
 */

export const SETTINGS_KEY = 'shiprocket_checkout';

export interface ShiprocketPublicStatus {
  enabled: boolean;
  environment: ShiprocketEnvironment;
  scriptUrl: string;
  styleUrl: string;
  /** Offer Shiprocket on the cart page. */
  cart: boolean;
  /** Offer Shiprocket on the product page "Buy Now". */
  buyNow: boolean;
  reason?: 'not_configured' | 'env_disabled' | 'admin_disabled';
}

export interface RuntimeDecision {
  cfg: ShiprocketConfig;
  status: ShiprocketPublicStatus;
  adminDisabled: boolean;
}

export interface AdminSettings {
  enabled: boolean;
  cart: boolean;
  buyNow: boolean;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = { enabled: true, cart: true, buyNow: true };

/** Parse the stored JSON value; anything not explicitly `false` stays on. */
export function parseAdminSettings(v: any): AdminSettings {
  if (!v || typeof v !== 'object') return { ...DEFAULT_ADMIN_SETTINGS };
  return { enabled: v.enabled !== false, cart: v.cart !== false, buyNow: v.buy_now !== false };
}

export async function readAdminSettings(supabase: any): Promise<AdminSettings> {
  try {
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
    if (error) return { ...DEFAULT_ADMIN_SETTINGS };
    return parseAdminSettings(data?.value);
  } catch {
    return { ...DEFAULT_ADMIN_SETTINGS };
  }
}

export async function readAdminSwitch(supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
    if (error) return false; // table missing / transient: do not disable on a read error
    const v = data?.value;
    return !!v && v.enabled === false;
  } catch {
    return false;
  }
}

export function buildStatus(
  cfg: ShiprocketConfig,
  adminDisabled: boolean,
  placement: { cart: boolean; buyNow: boolean } = { cart: true, buyNow: true },
): ShiprocketPublicStatus {
  const ui = uiUrlsFor(cfg.apiBase);
  const base = { environment: ui.env, scriptUrl: ui.scriptUrl, styleUrl: ui.styleUrl, cart: placement.cart, buyNow: placement.buyNow };
  if (!cfg.configured) return { enabled: false, reason: 'not_configured', ...base };
  if (cfg.killed) return { enabled: false, reason: 'env_disabled', ...base };
  if (adminDisabled) return { enabled: false, reason: 'admin_disabled', ...base };
  return { enabled: true, ...base };
}

export async function getRuntimeDecision(
  supabase: any,
  env: Record<string, string | undefined> = process.env,
): Promise<RuntimeDecision> {
  // Admin-entered credentials (if any) override env; a read failure falls back to env.
  const cfg = mergeConfig(getShiprocketConfig(env), await readStoredCredentials(supabase, env), env);
  const settings = cfg.enabled ? await readAdminSettings(supabase) : { ...DEFAULT_ADMIN_SETTINGS };
  const adminDisabled = !settings.enabled;
  return { cfg, adminDisabled, status: buildStatus(cfg, adminDisabled, { cart: settings.cart, buyNow: settings.buyNow }) };
}
