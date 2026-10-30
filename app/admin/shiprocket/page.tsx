'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

type Health = {
  primaryCheckout: 'shiprocket' | 'native';
  environment: 'production' | 'staging';
  credentialSource: 'admin' | 'env' | 'none';
  credentialsTableReady: boolean;
  storedCredentialsUnreadable: boolean;
  keys: { apiKey: string; apiSecret: string; webhookToken: string };
  placement: { cart: boolean; buyNow: boolean };
  env: Record<string, string>;
  adminEnabled: boolean;
  credentials: { ok: boolean; detail: string };
  catalogue: { products: number; source: string };
  urlsToRegister: Record<string, string>;
  recentShiprocketOrders: Array<{ id: number; order_id: string; total_amount: number; payment_method: string; created_at: string }>;
};

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 };
const input: React.CSSProperties = { display: 'block', width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', marginTop: 4, fontSize: 14 };
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, monospace', fontSize: 13, wordBreak: 'break-all' };
const pill = (ok: boolean): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
  background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#166534' : '#991b1b',
});

export default function ShiprocketAdminPage() {
  const [h, setH] = useState<Health | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging'>('production');
  const [webhookToken, setWebhookToken] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await fetch('/api/admin/shiprocket');
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed to load');
      setH(j);
    } catch (e: any) {
      setErr(e.message || 'Failed to load');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const post = async (body: any, label: string) => {
    setBusy(label); setMsg('');
    try {
      const res = await fetch('/api/admin/shiprocket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      setMsg(
        j.success
          ? body.action === 'sync_catalog'
            ? `Pushed ${j.pushed} of ${j.total} products.`
            : body.action === 'test_credentials'
              ? j.credentials?.detail || 'Tested.'
              : j.detail || 'Saved.'
          : j.error || `Failed${j.failures?.length ? `: ${j.failures[0].error}` : ''}`,
      );
      if (j.success && body.action === 'save_credentials') { setApiKey(''); setApiSecret(''); setWebhookToken(''); }
      await load();
    } catch (e: any) {
      setMsg(e.message || 'Failed');
    } finally {
      setBusy('');
    }
  };

  const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => setMsg('Copied.'));

  return (
    <AdminLayoutWrapper pageTitle="Shiprocket Checkout">
      <div style={{ maxWidth: 900 }}>
        {err && <div style={{ ...card, color: '#991b1b', background: '#fef2f2' }}>{err}</div>}
        {!h && !err && <div style={card}>Checking Shiprocket...</div>}
        {h && (
          <>
            <section style={card} id="sr-status">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Website checkout</h2>
              <p style={{ marginBottom: 12 }}>
                Primary checkout right now:{' '}
                <strong>{h.primaryCheckout === 'shiprocket' ? 'Shiprocket (Easebuzz/COD is the fallback)' : 'Native Easebuzz / COD'}</strong>{' '}
                <span style={pill(h.primaryCheckout === 'shiprocket')}>{h.environment}</span>
              </p>
              <p style={{ marginBottom: 12, color: '#374151' }}>
                WhatsApp ordering always uses Easebuzz and is not affected by this switch.
              </p>
              <button
                id="sr-toggle"
                disabled={!!busy}
                onClick={() => post({ action: 'set_enabled', enabled: !h.adminEnabled }, 'toggle')}
                style={{ padding: '8px 16px', borderRadius: 8, border: 0, color: '#fff', cursor: 'pointer', background: h.adminEnabled ? '#b91c1c' : '#15803d' }}
              >
                {busy === 'toggle' ? 'Saving...' : h.adminEnabled ? 'Switch OFF Shiprocket (use Easebuzz/COD for everyone)' : 'Switch Shiprocket back ON'}
              </button>
              <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
                Instant, no redeploy. Orders already paid on Shiprocket are still recorded while it is switched off.
              </p>
            </section>

            <section style={card} id="sr-keys">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>
                API credentials{' '}
                <span style={pill(h.credentialSource !== 'none')}>
                  {h.credentialSource === 'admin' ? 'saved here (encrypted)' : h.credentialSource === 'env' ? 'from Vercel env' : 'not set'}
                </span>
              </h2>
              {!h.credentialsTableReady && (
                <p style={{ color: '#991b1b', marginBottom: 8 }}>
                  One-time setup needed: run <code>supabase/migrations/SHIPROCKET_ADMIN_CONTROL.sql</code> in the Supabase SQL editor, then reload. Until then you can still use Vercel env variables.
                </p>
              )}
              {h.storedCredentialsUnreadable && (
                <p style={{ color: '#991b1b', marginBottom: 8 }}>
                  Saved credentials exist but cannot be decrypted (the encryption key changed). Re-enter them below.
                </p>
              )}
              <p style={{ marginBottom: 8, color: '#374151' }}>
                In use now: key <code>{h.keys.apiKey}</code>, secret <code>{h.keys.apiSecret}</code>. Values are tested with Shiprocket before they are saved and are never shown again.
              </p>
              <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
                <label style={{ fontSize: 13 }}>
                  API Key
                  <input id="sr-api-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={input} placeholder="paste the API Key" />
                </label>
                <label style={{ fontSize: 13 }}>
                  API Secret
                  <input id="sr-api-secret" type="password" autoComplete="off" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} style={input} placeholder="paste the API Secret" />
                </label>
                <label style={{ fontSize: 13 }}>
                  Environment
                  <select id="sr-environment" value={environment} onChange={(e) => setEnvironment(e.target.value as any)} style={input}>
                    <option value="production">Live (real money)</option>
                    <option value="staging">Staging / sandbox (test keys only)</option>
                  </select>
                </label>
                <label style={{ fontSize: 13 }}>
                  Order webhook token (optional, 16+ characters, recommended)
                  <input id="sr-webhook-token" type="password" autoComplete="off" value={webhookToken} onChange={(e) => setWebhookToken(e.target.value)} style={input} placeholder="any long random string; add the same value as header x-webhook-token in Shiprocket" />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  id="sr-save-keys"
                  disabled={!!busy || !apiKey || !apiSecret}
                  onClick={() => post({ action: 'save_credentials', apiKey, apiSecret, environment, webhookToken }, 'save')}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 0, background: '#704a0d', color: '#fff', cursor: 'pointer', opacity: !apiKey || !apiSecret ? 0.5 : 1 }}
                >
                  {busy === 'save' ? 'Testing and saving...' : 'Test and save credentials'}
                </button>
                <button
                  disabled={!!busy || h.credentialSource !== 'admin'}
                  onClick={() => { if (confirm('Remove the saved credentials? The site falls back to Vercel env values, if any.')) post({ action: 'clear_credentials' }, 'clear'); }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                >
                  Remove saved credentials
                </button>
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
                  Webhook protection: <strong>{h.keys.webhookToken}</strong>
                </p>
                {h.keys.webhookToken === 'set' && (
                  <button
                    disabled={!!busy}
                    onClick={() => { if (confirm('Remove webhook protection?')) post({ action: 'set_webhook_token', token: '' }, 'wh'); }}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}
                  >
                    Remove token
                  </button>
                )}
              </div>
            </section>

            <section style={card} id="sr-placement">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Where to offer Shiprocket</h2>
              <p style={{ marginBottom: 8, color: '#374151' }}>Turn Shiprocket on or off per place. Anywhere it is off, shoppers get the standard Easebuzz / COD checkout.</p>
              <label style={{ display: 'block', marginBottom: 6 }}>
                <input type="checkbox" id="sr-place-cart" checked={h.placement.cart} disabled={!!busy} onChange={(e) => post({ action: 'set_placement', cart: e.target.checked }, 'place')} /> Cart page ("Proceed to Checkout")
              </label>
              <label style={{ display: 'block' }}>
                <input type="checkbox" id="sr-place-buynow" checked={h.placement.buyNow} disabled={!!busy} onChange={(e) => post({ action: 'set_placement', buy_now: e.target.checked }, 'place')} /> Product page ("Buy Now")
              </label>
            </section>

            <section style={card} id="sr-credentials">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Connection test <span style={pill(h.credentials.ok)}>{h.credentials.ok ? 'OK' : 'Problem'}</span></h2>
              <p>{h.credentials.detail}</p>
              <button disabled={!!busy} onClick={() => post({ action: 'test_credentials' }, 'test')} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>{busy === 'test' ? 'Testing...' : 'Re-test'}</button>
            </section>

            <section style={card} id="sr-env">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Environment variables (values hidden)</h2>
              <table style={{ width: '100%', fontSize: 14 }}>
                <tbody>
                  {Object.entries(h.env).map(([k, v]) => (
                    <tr key={k} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 8px', ...mono }}>{k}</td>
                      <td style={{ padding: '6px 8px' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={card} id="sr-urls">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>URLs to give Shiprocket</h2>
              {Object.entries(h.urlsToRegister).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ width: 170, fontSize: 13, color: '#6b7280' }}>{k}</span>
                  <code style={{ ...mono, flex: 1 }}>{v}</code>
                  <button onClick={() => copy(v)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Copy</button>
                </div>
              ))}
            </section>

            <section style={card} id="sr-catalogue">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Catalogue ({h.catalogue.products} live products, from {h.catalogue.source})</h2>
              <p style={{ marginBottom: 8, color: '#374151' }}>Shiprocket pulls this automatically and is notified when you edit a product. Use this if prices look stale inside Shiprocket.</p>
              <button disabled={!!busy} onClick={() => post({ action: 'sync_catalog' }, 'sync')} style={{ padding: '8px 16px', borderRadius: 8, border: 0, background: '#704a0d', color: '#fff', cursor: 'pointer' }}>
                {busy === 'sync' ? 'Pushing...' : 'Push all products to Shiprocket now'}
              </button>
            </section>

            <section style={card} id="sr-orders">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Latest Shiprocket orders</h2>
              {h.recentShiprocketOrders.length === 0 ? (
                <p style={{ color: '#6b7280' }}>None yet.</p>
              ) : (
                <ul>
                  {h.recentShiprocketOrders.map((o) => (
                    <li key={o.id} style={{ padding: '4px 0' }}>
                      {o.order_id} - ₹{o.total_amount} - {o.payment_method} - {new Date(o.created_at).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {msg && <p role="status" style={{ color: '#374151' }}>{msg}</p>}
          </>
        )}
      </div>
    </AdminLayoutWrapper>
  );
}
