'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

type Health = {
  primaryCheckout: 'shiprocket' | 'native';
  environment: 'production' | 'staging';
  env: Record<string, string>;
  adminEnabled: boolean;
  credentials: { ok: boolean; detail: string };
  catalogue: { products: number; source: string };
  urlsToRegister: Record<string, string>;
  recentShiprocketOrders: Array<{ id: number; order_id: string; total_amount: number; payment_method: string; created_at: string }>;
};

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 };
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
      setMsg(j.success ? (body.action === 'sync_catalog' ? `Pushed ${j.pushed} of ${j.total} products.` : 'Saved.') : (j.error || `Failed${j.failures?.length ? `: ${j.failures[0].error}` : ''}`));
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

            <section style={card} id="sr-credentials">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Connection test <span style={pill(h.credentials.ok)}>{h.credentials.ok ? 'OK' : 'Problem'}</span></h2>
              <p>{h.credentials.detail}</p>
              <button disabled={!!busy} onClick={load} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Re-test</button>
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
