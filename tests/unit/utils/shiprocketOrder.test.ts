/**
 * finalizeShiprocketOrder - against an in-memory fake Supabase and a fake Shiprocket.
 * Heavy collaborators (iCarry, WhatsApp, Meta CAPI) are stubbed so only the
 * order logic is under test.
 */
jest.mock('@/utils/orderShipment', () => ({ syncOrderShipment: async () => ({ success: true, trackingId: 'T', shipmentId: 'S' }) }));
jest.mock('@/services/communications/integration/orderNotifications', () => ({
  notifyOrderPlaced: async () => {},
  notifyPaymentConfirmed: async () => {},
}));
jest.mock('@/utils/metaCapi', () => ({ capiPurchase: async () => ({ ok: true }) }));
jest.mock('@/utils/coupons', () => ({ recordCouponUsage: async () => {} }));

import { finalizeShiprocketOrder } from '@/utils/shiprocketOrder';
import { VARIANT_ID_OFFSET } from '@/utils/shiprocketCheckout';

type Row = Record<string, any>;
function fakeSupabase(seed: Record<string, Row[]>) {
  const db: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const q = (table: string) => {
    let rows = () => db[table] || (db[table] = []);
    const filters: Array<(r: Row) => boolean> = [];
    let op: 'select' | 'insert' | 'delete' = 'select';
    let payload: Row[] = [];
    const api: any = {
      select() { return api; },
      insert(p: Row[]) { op = 'insert'; payload = p; return api; },
      delete() { op = 'delete'; return api; },
      eq(c: string, v: any) { filters.push((r) => String(r[c]) === String(v)); return api; },
      in(c: string, vs: any[]) { filters.push((r) => vs.map(String).includes(String(r[c]))); return api; },
      ilike(c: string, v: string) { filters.push((r) => String(r[c]).toLowerCase() === String(v).toLowerCase()); return api; },
      order() { return api; },
      limit() { return api; },
      then(res: any) {
        const matched = rows().filter((r) => filters.every((f) => f(r)));
        if (op === 'insert') {
          for (const p of payload) {
            if (table === 'orders' && p.txn_id && rows().some((r) => r.txn_id === p.txn_id)) {
              return res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } });
            }
            rows().push({ ...p });
          }
          return res({ data: payload.map((p) => ({ ...p })), error: null });
        }
        if (op === 'delete') { db[table] = rows().filter((r) => !matched.includes(r)); return res({ data: null, error: null }); }
        return res({ data: matched, error: null });
      },
    };
    return api;
  };
  return { db, from: q };
}

const cfg = { enabled: true, configured: true, apiKey: 'K', apiSecret: 'S', apiBase: 'https://sr.test' };
const OID = '686233cd1ff136306c2bf410';
const srOrder = (over: Row = {}) => ({
  order_id: OID,
  cart_data: { items: [{ variant_id: String(VARIANT_ID_OFFSET + 15), quantity: 2 }] },
  status: 'SUCCESS', phone: '9876543210', email: 'buyer@example.com',
  shipping_address: { line1: '12 MG Road', line2: 'Indiranagar', city: 'Bengaluru', pincode: '560038', state: 'Karnataka', country: 'India', first_name: 'Asha', last_name: 'Rao' },
  payment_type: 'PREPAID', payment_status: 'Success',
  payments: [{ payment_status: 'Success', amount_received: 1058 }],
  coupon_codes: [], coupon_discount: 0, subtotal_price: 1058, total_amount_payable: 1058, shipping_charges: 0,
  ...over,
});
const fetchReturning = (order: Row | null, status = 200) => {
  let calls = 0;
  const f: any = async () => { calls++; return { ok: status < 400, status, json: async () => (order ? { ok: true, result: order } : { ok: false, error: 'not found' }) }; };
  f.calls = () => calls;
  return f;
};
const seed = () => ({
  products: [{ id: 15, handle: 'combo', title: 'Combo', price: 529, regular_price: 948, sku: 'C1', category: 'combo-s' }],
  orders: [], order_sessions: [], users: [{ id: 'user-1', email: 'buyer@example.com' }], cart: [{ user_id: 'user-1', product_id: 15 }], coupons: [],
});

describe('finalizeShiprocketOrder', () => {
  it('creates a prepaid order priced from OUR products table', async () => {
    const sb = fakeSupabase(seed());
    const r: any = await finalizeShiprocketOrder(sb, cfg, OID, fetchReturning(srOrder()));
    expect(r.ok).toBe(true);
    expect(r.alreadyExisted).toBe(false);
    const o = sb.db.orders[0];
    expect(o.txn_id).toBe('SR-' + OID);
    expect(o.payment_method).toBe('online');
    expect(o.total_amount).toBe(1058);
    expect(o.transaction_price).toBe(1058);
    expect(o.items).toEqual([{ id: 15, quantity: 2, price: 529, regular_price: 948, title: 'Combo', handle: 'combo', sku: 'C1', category: 'combo-s', image_url: undefined }].map((x) => JSON.parse(JSON.stringify(x))));
    expect(o.shipping_data.fullName).toBe('Asha Rao');
    expect(o.shipping_data.checkoutSource).toBe('shiprocket');
    expect(o.status).toBe('placed');
  });

  it('is idempotent: a repeated webhook creates exactly one order and does not call Shiprocket again', async () => {
    const sb = fakeSupabase(seed());
    const f = fetchReturning(srOrder());
    await finalizeShiprocketOrder(sb, cfg, OID, f);
    const again: any = await finalizeShiprocketOrder(sb, cfg, OID, f);
    expect(again.ok).toBe(true);
    expect(again.alreadyExisted).toBe(true);
    expect(sb.db.orders.length).toBe(1);
    expect(f.calls()).toBe(1);
  });

  it('a concurrent duplicate that loses the insert race returns the winner instead of failing', async () => {
    const sb = fakeSupabase(seed());
    const f = fetchReturning(srOrder());
    const [a, b]: any[] = await Promise.all([finalizeShiprocketOrder(sb, cfg, OID, f), finalizeShiprocketOrder(sb, cfg, OID, f)]);
    expect(a.ok && b.ok).toBe(true);
    expect(sb.db.orders.length).toBe(1);
  });

  it('FORGED webhook: an order id Shiprocket does not know creates nothing and is not retried', async () => {
    const sb = fakeSupabase(seed());
    const r: any = await finalizeShiprocketOrder(sb, cfg, 'forged_order_id_123', fetchReturning(null, 404));
    expect(r.ok).toBe(false);
    expect(r.retryable).toBe(false);
    expect(sb.db.orders.length).toBe(0);
  });

  it('a Shiprocket outage is retryable so the webhook is redelivered', async () => {
    const sb = fakeSupabase(seed());
    const r: any = await finalizeShiprocketOrder(sb, cfg, OID, fetchReturning(null, 503));
    expect(r.ok).toBe(false);
    expect(r.retryable).toBe(true);
    expect(sb.db.orders.length).toBe(0);
  });

  it('does not create an order for an unfinished or unpaid Shiprocket order', async () => {
    for (const over of [{ status: 'INITIATED' }, { status: 'FAILED' }, { payment_status: 'Pending' }]) {
      const sb = fakeSupabase(seed());
      const r: any = await finalizeShiprocketOrder(sb, cfg, OID, fetchReturning(srOrder(over)));
      expect(r.ok).toBe(false);
      expect(sb.db.orders.length).toBe(0);
    }
  });

  it('rejects when Shiprocket returns a different order id than the one asked for', async () => {
    const sb = fakeSupabase(seed());
    const r: any = await finalizeShiprocketOrder(sb, cfg, OID, fetchReturning(srOrder({ order_id: 'aaaaaaaaaaaaaaaaaaaaaaaa' })));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('order_id_mismatch');
  });

  it('rejects malformed order ids before any network call', async () => {
    const sb = fakeSupabase(seed());
    const f = fetchReturning(srOrder());
    for (const bad of ['', 'a b', '../../etc', 'x'.repeat(100), "1'; drop table orders;--"]) {
      const r: any = await finalizeShiprocketOrder(sb, cfg, bad, f);
      expect(r.ok).toBe(false);
    }
    expect(f.calls()).toBe(0);
  });

  it('records a pure COD order as nothing paid online', async () => {
    const sb = fakeSupabase(seed());
    await finalizeShiprocketOrder(sb, cfg, OID, fetchReturning(srOrder({
      payment_type: 'CASH_ON_DELIVERY', payment_status: 'Pending', payments: [], cod_charges: 49, total_amount_payable: 1107,
    })));
    const o = sb.db.orders[0];
    expect(o.payment_method).toBe('cod');
    expect(o.transaction_price).toBe(0);
    expect(o.total_amount).toBe(1107);
    expect(o.shipping_data.srCodCharges).toBe(49);
  });

  it('fails (retryable=false) when an ordered product no longer exists', async () => {
    const s = seed(); s.products = [];
    const sb = fakeSupabase(s);
    const r: any = await finalizeShiprocketOrder(sb, cfg, OID, fetchReturning(srOrder()));
    expect(r.ok).toBe(false);
    expect(r.retryable).toBe(false);
    expect(sb.db.orders.length).toBe(0);
  });

  it('attaches the order to the account remembered at checkout, else matches by email, else guest', async () => {
    const a = fakeSupabase({ ...seed(), order_sessions: [{ txn_id: 'SR-' + OID, payload: { userId: 'session-user' } }] });
    await finalizeShiprocketOrder(a, cfg, OID, fetchReturning(srOrder()));
    expect(a.db.orders[0].user_id).toBe('session-user');

    const b = fakeSupabase(seed());
    await finalizeShiprocketOrder(b, cfg, OID, fetchReturning(srOrder()));
    expect(b.db.orders[0].user_id).toBe('user-1');

    const c = fakeSupabase(seed());
    await finalizeShiprocketOrder(c, cfg, OID, fetchReturning(srOrder({ email: 'stranger@example.com' })));
    expect(c.db.orders[0].user_id).toBe(null);
  });

  it('side effects clear the buyer cart, and only on the call that created the order', async () => {
    const sb = fakeSupabase(seed());
    const r: any = await finalizeShiprocketOrder(sb, cfg, OID, fetchReturning(srOrder()));
    expect(sb.db.cart.length).toBe(1);
    await r.sideEffects();
    expect(sb.db.cart.length).toBe(0);
  });
});
