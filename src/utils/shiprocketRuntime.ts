import { getShiprocketConfig, uiUrlsFor, type ShiprocketConfig, type ShiprocketEnvironment } from './shiprocketCheckout';

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
 * Any failure reading the DB switch fails SAFE toward Shiprocket staying as
 * configured, because the browser has its own fallback to the native checkout.
 */

export const SETTINGS_KEY = 'shiprocket_checkout';

export interface ShiprocketPublicStatus {
  enabled: boolean;
  environment: ShiprocketEnvironment;
  scriptUrl: string;
  styleUrl: string;
  reason?: 'not_configured' | 'env_disabled' | 'admin_disabled';
}

export interface RuntimeDecision {
  cfg: ShiprocketConfig;
  status: ShiprocketPublicStatus;
  adminDisabled: boolean;
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

export function buildStatus(cfg: ShiprocketConfig, adminDisabled: boolean): ShiprocketPublicStatus {
  const ui = uiUrlsFor(cfg.apiBase);
  const base = { environment: ui.env, scriptUrl: ui.scriptUrl, styleUrl: ui.styleUrl };
  if (!cfg.configured) return { enabled: false, reason: 'not_configured', ...base };
  if (cfg.killed) return { enabled: false, reason: 'env_disabled', ...base };
  if (adminDisabled) return { enabled: false, reason: 'admin_disabled', ...base };
  return { enabled: true, ...base };
}

export async function getRuntimeDecision(
  supabase: any,
  env: Record<string, string | undefined> = process.env,
): Promise<RuntimeDecision> {
  const cfg = getShiprocketConfig(env);
  const adminDisabled = cfg.enabled ? await readAdminSwitch(supabase) : false;
  return { cfg, adminDisabled, status: buildStatus(cfg, adminDisabled) };
}
