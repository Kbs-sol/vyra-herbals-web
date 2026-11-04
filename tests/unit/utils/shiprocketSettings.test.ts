import { decryptSecret, encryptSecret, maskSecret } from '@/utils/shiprocketCrypto';
import {
  mergeConfig,
  readStoredCredentials,
  resolveShiprocketConfig,
  validateCredentialInput,
} from '@/utils/shiprocketSettings';
import {
  DEFAULT_API_BASE,
  STAGING_API_BASE,
  explainShiprocketError,
  getShiprocketConfig,
  verifyWebhookToken,
} from '@/utils/shiprocketCheckout';
import { buildStatus, getRuntimeDecision, parseAdminSettings } from '@/utils/shiprocketRuntime';

const ENV = { JWT_SECRET: 'j'.repeat(40) };
const envKeys = { ...ENV, SHIPROCKET_CHECKOUT_API_KEY: 'envkey-123456', SHIPROCKET_CHECKOUT_API_SECRET: 'envsecret-123456789' };

/** Fake supabase serving both tables used by the runtime decision. */
function fakeSb(opts: { cred?: any; credError?: any; settings?: any; throws?: boolean }) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (opts.throws) throw new Error('network');
            if (table === 'shiprocket_credentials') return { data: opts.cred ?? null, error: opts.credError ?? null };
            return { data: opts.settings === undefined ? null : { value: opts.settings }, error: null };
          },
        }),
      }),
    }),
  };
}

const storedRow = (key = 'adminkey-123456', secret = 'adminsecret-123456789', token = '', environment = 'production') => ({
  api_key_enc: encryptSecret(key, ENV),
  api_secret_enc: encryptSecret(secret, ENV),
  webhook_token_enc: token ? encryptSecret(token, ENV) : null,
  environment,
});

describe('shiprocketCrypto', () => {
  it('round-trips and never stores plaintext', () => {
    const blob = encryptSecret('super-secret-value', ENV);
    expect(blob.startsWith('v1:')).toBe(true);
    expect(blob.includes('super-secret-value')).toBe(false);
    expect(decryptSecret(blob, ENV)).toBe('super-secret-value');
  });
  it('uses a fresh IV every time', () => {
    expect(encryptSecret('x', ENV)).not.toBe(encryptSecret('x', ENV));
  });
  it('returns null (never throws) for tampered, wrong-key, empty or malformed input', () => {
    const blob = encryptSecret('abc', ENV);
    const parts = blob.split(':');
    parts[3] = Buffer.from('tampered').toString('base64');
    expect(decryptSecret(parts.join(':'), ENV)).toBeNull();
    expect(decryptSecret(blob, { JWT_SECRET: 'k'.repeat(40) })).toBeNull();
    expect(decryptSecret('', ENV)).toBeNull();
    expect(decryptSecret(null, ENV)).toBeNull();
    expect(decryptSecret('garbage', ENV)).toBeNull();
  });
  it('prefers a dedicated SHIPROCKET_ENCRYPTION_KEY over JWT_SECRET', () => {
    const blob = encryptSecret('abc', { ...ENV, SHIPROCKET_ENCRYPTION_KEY: 'dedicated-key-dedicated-key-1234' });
    expect(decryptSecret(blob, ENV)).toBeNull();
    expect(decryptSecret(blob, { ...ENV, SHIPROCKET_ENCRYPTION_KEY: 'dedicated-key-dedicated-key-1234' })).toBe('abc');
  });
  it('refuses to encrypt with no key material at all', () => {
    expect(() => encryptSecret('abc', {})).toThrow();
  });
  it('masks without leaking', () => {
    expect(maskSecret('abcdefghijklmnop')).toBe('abc…op (16 chars)');
    expect(maskSecret('')).toBe('not set');
    expect(maskSecret('short')).toBe('set (5 chars)');
  });
});

describe('credential resolution (admin vs env)', () => {
  it('admin-saved credentials override env and pick the base from the stored environment', async () => {
    const cfg = await resolveShiprocketConfig(fakeSb({ cred: storedRow('adminkey-123456', 'adminsecret-123456789', '', 'staging') }), envKeys);
    expect(cfg.apiKey).toBe('adminkey-123456');
    expect(cfg.apiSecret).toBe('adminsecret-123456789');
    expect(cfg.apiBase).toBe(STAGING_API_BASE);
    expect(cfg.source).toBe('admin');
    expect(cfg.enabled).toBe(true);
  });
  it('production environment uses the live base even if env points at staging', async () => {
    const cfg = await resolveShiprocketConfig(
      fakeSb({ cred: storedRow() }),
      { ...envKeys, SHIPROCKET_CHECKOUT_API_BASE: STAGING_API_BASE },
    );
    expect(cfg.apiBase).toBe(DEFAULT_API_BASE);
  });
  it('falls back to env when nothing is stored', async () => {
    const cfg = await resolveShiprocketConfig(fakeSb({}), envKeys);
    expect(cfg.apiKey).toBe('envkey-123456');
    expect(cfg.source).toBe('env');
  });
  it('falls back to env when the table is missing or the read throws', async () => {
    expect((await resolveShiprocketConfig(fakeSb({ credError: { code: '42P01' } }), envKeys)).source).toBe('env');
    expect((await resolveShiprocketConfig(fakeSb({ throws: true }), envKeys)).source).toBe('env');
  });
  it('falls back to env when stored values cannot be decrypted (key rotated), and flags it', async () => {
    const sb = fakeSb({ cred: storedRow() });
    const rotated = { JWT_SECRET: 'z'.repeat(40), SHIPROCKET_CHECKOUT_API_KEY: 'envkey-123456', SHIPROCKET_CHECKOUT_API_SECRET: 'envsecret-123456789' };
    const stored = await readStoredCredentials(sb, rotated);
    expect(stored?.undecryptable).toBe(true);
    const cfg = await resolveShiprocketConfig(sb, rotated);
    expect(cfg.source).toBe('env');
    expect(cfg.apiKey).toBe('envkey-123456');
  });
  it('nothing anywhere -> not configured', async () => {
    const cfg = await resolveShiprocketConfig(fakeSb({}), ENV);
    expect(cfg.configured).toBe(false);
    expect(cfg.enabled).toBe(false);
    expect(cfg.source).toBe('none');
  });
  it('env kill switch still wins over admin-saved credentials', () => {
    const merged = mergeConfig(
      getShiprocketConfig({ ...envKeys, SHIPROCKET_CHECKOUT_ENABLED: 'false' }),
      { apiKey: 'a'.repeat(10), apiSecret: 'b'.repeat(14), webhookToken: '', environment: 'production', undecryptable: false },
      ENV,
    );
    expect(merged.configured).toBe(true);
    expect(merged.enabled).toBe(false);
  });
  it('webhook token: stored wins, then SHIPROCKET_WEBHOOK_TOKEN env, else empty', async () => {
    expect((await resolveShiprocketConfig(fakeSb({ cred: storedRow('adminkey-123456', 'adminsecret-123456789', 'stored-token-1234567') }), envKeys)).webhookToken).toBe('stored-token-1234567');
    expect((await resolveShiprocketConfig(fakeSb({}), { ...envKeys, SHIPROCKET_WEBHOOK_TOKEN: 'env-token-123456789' })).webhookToken).toBe('env-token-123456789');
    expect((await resolveShiprocketConfig(fakeSb({}), envKeys)).webhookToken).toBe('');
  });
});

describe('validateCredentialInput', () => {
  it('accepts a plausible pair', () => {
    expect(validateCredentialInput('abcdefgh1234', 'secretsecret1234')).toBeNull();
  });
  it('rejects empty, spaced, short and identical values', () => {
    expect(validateCredentialInput('', 'x')).toMatch(/required/);
    expect(validateCredentialInput('abc def12345', 'secretsecret1234')).toMatch(/spaces/);
    expect(validateCredentialInput('abcdefgh1234', 'secret\nsecret1234')).toMatch(/spaces/);
    expect(validateCredentialInput('abc', 'secretsecret1234')).toMatch(/key looks too short/);
    expect(validateCredentialInput('abcdefgh1234', 'short')).toMatch(/secret looks too short/);
    expect(validateCredentialInput('samevalue12345', 'samevalue12345')).toMatch(/identical/);
  });
});

describe('verifyWebhookToken', () => {
  it('passes everything when no token is configured (backwards compatible)', () => {
    expect(verifyWebhookToken(null, '')).toBe(true);
    expect(verifyWebhookToken('anything', undefined)).toBe(true);
  });
  it('requires an exact match when configured', () => {
    expect(verifyWebhookToken('right-token-12345678', 'right-token-12345678')).toBe(true);
    expect(verifyWebhookToken('wrong-token-12345678', 'right-token-12345678')).toBe(false);
    expect(verifyWebhookToken('', 'right-token-12345678')).toBe(false);
    expect(verifyWebhookToken(null, 'right-token-12345678')).toBe(false);
  });
});

describe('explainShiprocketError', () => {
  it('maps auth failures to the re-copy instructions, including the dashboard-key hint', () => {
    for (const [st, msg] of [[401, 'x'], [403, 'x'], [511, 'x'], [400, 'client token is not authorized'], [400, 'Invalid HMAC signature']] as const) {
      expect(explainShiprocketError(st, msg)).toMatch(/rejected the API key/);
    }
    expect(explainShiprocketError(401, '')).toMatch(/client token is not authorized/);
  });
  it('maps network, timeout, 404, 429 and 5xx distinctly', () => {
    expect(explainShiprocketError(undefined, 'Shiprocket timed out')).toMatch(/did not answer in time/);
    expect(explainShiprocketError(undefined, 'fetch failed')).toMatch(/Could not reach/);
    expect(explainShiprocketError(404, 'nf')).toMatch(/base URL/);
    expect(explainShiprocketError(429, '')).toMatch(/rate limiting/);
    expect(explainShiprocketError(502, '')).toMatch(/server error/);
  });
});

describe('placement switches (cart / buy now)', () => {
  it('default to on when nothing is stored or the value is malformed', () => {
    expect(parseAdminSettings(undefined)).toEqual({ enabled: true, cart: true, buyNow: true });
    expect(parseAdminSettings('x')).toEqual({ enabled: true, cart: true, buyNow: true });
    expect(parseAdminSettings({})).toEqual({ enabled: true, cart: true, buyNow: true });
  });
  it('only an explicit false turns something off', () => {
    expect(parseAdminSettings({ cart: false })).toEqual({ enabled: true, cart: false, buyNow: true });
    expect(parseAdminSettings({ buy_now: false })).toEqual({ enabled: true, cart: true, buyNow: false });
    expect(parseAdminSettings({ enabled: false })).toEqual({ enabled: false, cart: true, buyNow: true });
    expect(parseAdminSettings({ cart: 0, buy_now: null })).toEqual({ enabled: true, cart: true, buyNow: true });
  });
  it('flow through to the public status without leaking secrets', async () => {
    const d = await getRuntimeDecision(fakeSb({ settings: { cart: true, buy_now: false } }), envKeys);
    expect(d.status.enabled).toBe(true);
    expect(d.status.cart).toBe(true);
    expect(d.status.buyNow).toBe(false);
    const json = JSON.stringify(d.status);
    expect(json.includes('envsecret')).toBe(false);
    expect(json.includes('envkey')).toBe(false);
  });
  it('admin-saved credentials make the runtime enabled with no env keys at all', async () => {
    const d = await getRuntimeDecision(fakeSb({ cred: storedRow() }), ENV);
    expect(d.status.enabled).toBe(true);
    expect(d.cfg.source).toBe('admin');
  });
  it('master switch off -> disabled with admin_disabled even with admin-saved keys', async () => {
    const d = await getRuntimeDecision(fakeSb({ cred: storedRow(), settings: { enabled: false } }), ENV);
    expect(d.status.enabled).toBe(false);
    expect(d.status.reason).toBe('admin_disabled');
  });
  it('buildStatus defaults placements to on', () => {
    expect(buildStatus(getShiprocketConfig(envKeys), false)).toMatchObject({ enabled: true, cart: true, buyNow: true });
  });
});
