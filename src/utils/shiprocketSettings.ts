/**
 * Where do the Shiprocket credentials come from?
 *
 *   1. /admin/shiprocket  -> table `shiprocket_credentials` (AES-256-GCM encrypted, service-role only)
 *   2. Vercel env         -> SHIPROCKET_CHECKOUT_API_KEY / _API_SECRET / _API_BASE
 *
 * Admin-entered values win, so the owner can rotate keys, switch staging <-> live
 * and add the webhook token without a redeploy. "Clear" in the admin page falls
 * back to the env values. Every reader (token route, webhook, finalize, cron,
 * catalogue sync, admin) goes through resolveShiprocketConfig so they can never
 * disagree about which key is in use.
 *
 * Failure policy: any problem reading or decrypting the stored row (table not
 * created yet, encryption key rotated, network blip) silently falls back to the
 * env credentials. A broken settings table must never take the checkout down.
 */
import {
  DEFAULT_API_BASE,
  STAGING_API_BASE,
  getShiprocketConfig,
  type ShiprocketConfig,
  type ShiprocketEnvironment,
} from './shiprocketCheckout';
import { decryptSecret } from './shiprocketCrypto';

export const CREDENTIALS_TABLE = 'shiprocket_credentials';

export interface StoredCredentials {
  apiKey: string;
  apiSecret: string;
  webhookToken: string;
  environment: ShiprocketEnvironment;
  /** Ciphertext existed but could not be decrypted (key rotated / tampered). */
  undecryptable: boolean;
}

export async function readStoredCredentials(
  supabase: any,
  env: Record<string, string | undefined> = process.env,
): Promise<StoredCredentials | null> {
  try {
    const { data, error } = await supabase
      .from(CREDENTIALS_TABLE)
      .select('api_key_enc, api_secret_enc, webhook_token_enc, environment')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return null;
    const apiKey = decryptSecret(data.api_key_enc, env) || '';
    const apiSecret = decryptSecret(data.api_secret_enc, env) || '';
    const webhookToken = decryptSecret(data.webhook_token_enc, env) || '';
    const hadCipher = !!(data.api_key_enc || data.api_secret_enc || data.webhook_token_enc);
    const gotPlain = !!(apiKey || apiSecret || webhookToken);
    if (!hadCipher && !data.environment) return null;
    return {
      apiKey,
      apiSecret,
      webhookToken,
      environment: data.environment === 'staging' ? 'staging' : 'production',
      undecryptable: hadCipher && !gotPlain,
    };
  } catch {
    return null;
  }
}

/** Pure merge (unit-tested). `envCfg` comes from getShiprocketConfig(env). */
export function mergeConfig(
  envCfg: ShiprocketConfig,
  stored: StoredCredentials | null,
  env: Record<string, string | undefined> = process.env,
): ShiprocketConfig {
  const storedKeys = !!stored && !!stored.apiKey && !!stored.apiSecret;
  const webhookToken = (stored?.webhookToken || (env.SHIPROCKET_WEBHOOK_TOKEN || '').trim() || '');

  if (storedKeys) {
    return {
      ...envCfg,
      apiKey: stored!.apiKey,
      apiSecret: stored!.apiSecret,
      apiBase: stored!.environment === 'staging' ? STAGING_API_BASE : DEFAULT_API_BASE,
      configured: true,
      enabled: !envCfg.killed,
      source: 'admin',
      webhookToken,
    };
  }
  return { ...envCfg, source: envCfg.configured ? 'env' : 'none', webhookToken };
}

export async function resolveShiprocketConfig(
  supabase: any,
  env: Record<string, string | undefined> = process.env,
): Promise<ShiprocketConfig> {
  const stored = await readStoredCredentials(supabase, env);
  return mergeConfig(getShiprocketConfig(env), stored, env);
}

/** Basic sanity checks on pasted credentials; returns an error message or null. */
export function validateCredentialInput(apiKey: unknown, apiSecret: unknown): string | null {
  const k = String(apiKey ?? '');
  const s = String(apiSecret ?? '');
  if (!k.trim() || !s.trim()) return 'Both the API key and the API secret are required.';
  if (/\s/.test(k.trim()) || /\s/.test(s.trim())) return 'The key and secret must not contain spaces or line breaks. Re-copy them.';
  if (k.trim().length < 8) return 'The API key looks too short. Copy the whole value from the Shiprocket checkout dashboard.';
  if (s.trim().length < 12) return 'The API secret looks too short. It is long: make sure the copy was not cut off.';
  if (k.trim() === s.trim()) return 'The key and the secret are identical; one of them was pasted into both boxes.';
  return null;
}
