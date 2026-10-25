import { buildStatus, getRuntimeDecision, readAdminSwitch } from '@/utils/shiprocketRuntime';
import { getShiprocketConfig } from '@/utils/shiprocketCheckout';

const keys = { SHIPROCKET_CHECKOUT_API_KEY: 'k', SHIPROCKET_CHECKOUT_API_SECRET: 's' };
const sbWith = (value: any, error: any = null, throws = false) => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          if (throws) throw new Error('network');
          return { data: value === undefined ? null : { value }, error };
        },
      }),
    }),
  }),
});

describe('shiprocket runtime decision', () => {
  it('enabled when configured and the admin switch is untouched', async () => {
    const d = await getRuntimeDecision(sbWith(undefined), keys);
    expect(d.status.enabled).toBe(true);
    expect(d.status.environment).toBe('production');
  });
  it('admin kill switch (site_settings.enabled=false) disables it instantly', async () => {
    const d = await getRuntimeDecision(sbWith({ enabled: false }), keys);
    expect(d.status.enabled).toBe(false);
    expect(d.status.reason).toBe('admin_disabled');
  });
  it('re-enabling from admin ({enabled:true}) turns it back on', async () => {
    expect((await getRuntimeDecision(sbWith({ enabled: true }), keys)).status.enabled).toBe(true);
  });
  it('env kill switch wins and the DB is not needed', async () => {
    const d = await getRuntimeDecision(sbWith({ enabled: true }), { ...keys, SHIPROCKET_CHECKOUT_ENABLED: 'false' });
    expect(d.status.enabled).toBe(false);
    expect(d.status.reason).toBe('env_disabled');
  });
  it('not configured -> disabled with reason', async () => {
    const d = await getRuntimeDecision(sbWith(undefined), {});
    expect(d.status.enabled).toBe(false);
    expect(d.status.reason).toBe('not_configured');
  });
  it('a DB read error or exception never disables a configured Shiprocket (browser has its own fallback)', async () => {
    expect(await readAdminSwitch(sbWith(undefined, { code: '42P01', message: 'no table' }))).toBe(false);
    expect(await readAdminSwitch(sbWith(undefined, null, true))).toBe(false);
  });
  it('staging base gives the staging UI bundle in the public status', async () => {
    const d = await getRuntimeDecision(sbWith(undefined), { ...keys, SHIPROCKET_CHECKOUT_API_BASE: 'https://fastrr-api-dev.pickrr.com' });
    expect(d.status.environment).toBe('staging');
    expect(d.status.scriptUrl).toContain('customcheckoutfastrr.netlify.app');
  });
  it('the public status never carries a secret', () => {
    const json = JSON.stringify(buildStatus(getShiprocketConfig({ ...keys, SHIPROCKET_CHECKOUT_API_SECRET: 'TOPSECRET' }), false));
    expect(json.includes('TOPSECRET')).toBe(false);
    expect(json.includes('"k"')).toBe(false);
  });
});
