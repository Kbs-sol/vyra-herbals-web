/**
 * AES-256-GCM encryption for secrets stored in the database (Shiprocket key,
 * secret and webhook token entered from /admin/shiprocket).
 *
 * Key material, in order of preference:
 *   1. SHIPROCKET_ENCRYPTION_KEY  (recommended: a dedicated random string, 32+ chars)
 *   2. JWT_SECRET                 (always present; but rotating it makes stored
 *                                  values undecryptable - the app then falls back
 *                                  to env credentials and the admin must re-enter them)
 *
 * Format: "v1:<iv b64>:<tag b64>:<ciphertext b64>". GCM is authenticated, so a
 * tampered or wrong-key value fails to decrypt instead of returning garbage.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 'v1';

function keyFrom(env: Record<string, string | undefined>): Buffer {
  const material = (env.SHIPROCKET_ENCRYPTION_KEY || '').trim() || (env.JWT_SECRET || '').trim();
  if (!material) {
    throw new Error('Set SHIPROCKET_ENCRYPTION_KEY (or JWT_SECRET) so credentials can be stored encrypted.');
  }
  return createHash('sha256').update(`vyra-shiprocket:${material}`).digest();
}

export function encryptSecret(plain: string, env: Record<string, string | undefined> = process.env): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(env), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

/** Returns null (never throws) when the value is empty, malformed, tampered with, or the key changed. */
export function decryptSecret(blob: string | null | undefined, env: Record<string, string | undefined> = process.env): string | null {
  if (!blob) return null;
  try {
    const [v, iv, tag, data] = String(blob).split(':');
    if (v !== VERSION || !iv || !tag || !data) return null;
    const decipher = createDecipheriv('aes-256-gcm', keyFrom(env), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** "abc…yz (24 chars)" - enough to recognise a key, never enough to use it. */
export function maskSecret(v: string): string {
  if (!v) return 'not set';
  if (v.length <= 8) return `set (${v.length} chars)`;
  return `${v.slice(0, 3)}…${v.slice(-2)} (${v.length} chars)`;
}
