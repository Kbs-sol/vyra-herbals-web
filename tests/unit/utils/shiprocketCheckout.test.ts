import {
  signPayload,
  getShiprocketConfig,
  sanitizeCartLines,
  variantIdForProduct,
  productIdForVariant,
  mapProductToShiprocket,
  mapCategoryToCollection,
  parsePaging,
  mapShiprocketOrder,
  createCheckoutSession,
  fetchOrderDetails,
  VARIANT_ID_OFFSET,
  isOffValue,
  uiUrlsFor,
  environmentForBase,
  pushProductWebhook,
  pushCollectionWebhook,
  STAGING_API_BASE,
} from '@/utils/shiprocketCheckout';

// Verbatim from Shiprocket's "Order Webhook" documentation, with our variant ids.
const docOrder = (over: Record<string, any> = {}) => ({
  order_id: '686233cd1ff136306c2bf410',
  cart_data: { items: [{ variant_id: String(VARIANT_ID_OFFSET + 35), quantity: 2 }] },
  redirect_url: 'https://www.test.in/faster-success',
  status: 'SUCCESS',
  source: 'm-web',
  phone: '6302017947',
  email: 'buyer@example.com',
  shipping_plan: 'Express',
  shipping_address: {
    phone: '6302xxxxxx', line1: 'Flat 4', line2: 'Rajendra nagar', city: 'Hyderabad', pincode: '500030',
    state: 'Telangana', country: 'India', landmark: null, first_name: 'Asha', last_name: 'Rao', email: 'buyer@example.com',
  },
  shipping_charges: 0,
  payment_type: 'PREPAID',
  payment_status: 'Success',
  payments: [{ txn_id: 'T1', payment_status: 'Success', amount: 1586.68, amount_received: 1586.68 }],
  coupon_codes: ['GP2K'],
  coupon_discount: 100,
  cod_charges: null,
  subtotal_price: 1699,
  total_amount_payable: 1586.6800000000003,
  fastrr_order_id: '113535525',
  ...over,
});

describe('signPayload', () => {
  it('matches a known HMAC-SHA256 base64 vector', () => {
    // RFC 4231 test case 2 (key "Jefe"), base64 of the published hex digest.
    expect(signPayload('Jefe', 'what do ya want for nothing?')).toBe('W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=');
  });
});

describe('getShiprocketConfig', () => {
  const keys = { SHIPROCKET_CHECKOUT_API_KEY: 'k', SHIPROCKET_CHECKOUT_API_SECRET: 's' };
  it('is ON by default as soon as BOTH credentials exist (Shiprocket is the default checkout)', () => {
    const on = getShiprocketConfig(keys);
    expect(on.enabled).toBe(true);
    expect(on.killed).toBe(false);
    expect(on.apiBase).toBe('https://checkout-api.shiprocket.com');
  });
  it('is OFF without credentials, or with only one of them', () => {
    expect(getShiprocketConfig({}).enabled).toBe(false);
    expect(getShiprocketConfig({ SHIPROCKET_CHECKOUT_API_KEY: 'k' }).enabled).toBe(false);
    expect(getShiprocketConfig({ SHIPROCKET_CHECKOUT_API_SECRET: 's' }).enabled).toBe(false);
    expect(getShiprocketConfig({ SHIPROCKET_CHECKOUT_API_KEY: '  ', SHIPROCKET_CHECKOUT_API_SECRET: 's' }).configured).toBe(false);
  });
  it('honours the env kill switch (new and legacy names) without losing "configured"', () => {
    for (const v of ['false', 'FALSE', '0', 'off', 'no', 'disabled']) {
      const c = getShiprocketConfig({ ...keys, SHIPROCKET_CHECKOUT_ENABLED: v });
      expect(c.enabled).toBe(false);
      expect(c.killed).toBe(true);
      expect(c.configured).toBe(true);
    }
    expect(getShiprocketConfig({ ...keys, NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED: 'false' }).enabled).toBe(false);
  });
  it('does not treat unset, blank or "true" as the kill switch', () => {
    for (const v of [undefined, '', ' ', 'true', 'TRUE', '1', 'yes']) {
      expect(getShiprocketConfig({ ...keys, SHIPROCKET_CHECKOUT_ENABLED: v }).enabled).toBe(true);
    }
    expect(isOffValue(undefined)).toBe(false);
    expect(isOffValue('false')).toBe(true);
  });
  it('trims a trailing slash on the base url', () => {
    const c = getShiprocketConfig({ ...keys, SHIPROCKET_CHECKOUT_API_BASE: 'https://fastrr-api-dev.pickrr.com/' });
    expect(c.apiBase).toBe('https://fastrr-api-dev.pickrr.com');
  });
});

describe('staging vs production UI bundle', () => {
  it('uses the documented staging UI only with the staging API base', () => {
    expect(environmentForBase(STAGING_API_BASE)).toBe('staging');
    expect(environmentForBase('https://checkout-api.shiprocket.com')).toBe('production');
    expect(uiUrlsFor(STAGING_API_BASE).scriptUrl).toBe('https://customcheckoutfastrr.netlify.app/assets/js/channels/shopify.js');
    expect(uiUrlsFor('https://checkout-api.shiprocket.com').scriptUrl).toBe('https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js');
    expect(uiUrlsFor('https://checkout-api.shiprocket.com').styleUrl).toBe('https://checkout-ui.shiprocket.com/assets/styles/shopify.css');
  });
});

describe('variant ids', () => {
  it('round-trips and keeps product / variant id spaces disjoint', () => {
    expect(productIdForVariant(variantIdForProduct(15))).toBe(15);
    expect(variantIdForProduct(15)).toBeGreaterThan(VARIANT_ID_OFFSET);
  });
  it('accepts a bare product id and rejects junk', () => {
    expect(productIdForVariant(15)).toBe(15);
    expect(productIdForVariant('abc')).toBeNull();
    expect(productIdForVariant(-3)).toBeNull();
    expect(productIdForVariant(1.5)).toBeNull();
  });
});

describe('sanitizeCartLines', () => {
  it('merges duplicates, clamps quantity and drops invalid rows', () => {
    const out = sanitizeCartLines([
      { id: 3, quantity: 2 }, { id: '3', quantity: 4 }, { id: 9, quantity: 500 },
      { id: 'x', quantity: 1 }, { id: 4, quantity: 0 }, { id: -1, quantity: 1 }, null,
    ]);
    expect(out).toEqual([{ id: 3, quantity: 6 }, { id: 9, quantity: 10 }]);
  });
  it('returns [] for non-arrays and caps the number of lines', () => {
    expect(sanitizeCartLines('nope')).toEqual([]);
    expect(sanitizeCartLines(Array.from({ length: 80 }, (_, i) => ({ id: i + 1, quantity: 1 }))).length).toBe(30);
  });
});

describe('catalogue mapping', () => {
  const row = { id: 15, handle: 'combo', title: 'Hair Oil & Shampoo', price: 529, regular_price: 948, image_url: '/a.jpg', sku: 'S1', description: 'a <b> & c', category: 'combo-s', stock_quantity: null };
  it('emits long ids, string prices, MRP and an absolute image', () => {
    const p = mapProductToShiprocket(row, 'https://vyraherbals.com');
    expect(p.id).toBe(15);
    expect(p.variants[0].id).toBe(variantIdForProduct(15));
    expect(p.variants[0].price).toBe('529.00');
    expect(p.variants[0].compare_at_price).toBe('948.00');
    expect(p.image.src).toBe('https://vyraherbals.com/a.jpg');
    expect(p.variants[0].quantity).toBe(100);
    expect(p.variants[0].grams).toBe(499);
    expect(p.status).toBe('active');
  });
  it('escapes HTML in the description and omits compare_at_price when not discounted', () => {
    const p = mapProductToShiprocket({ ...row, regular_price: 529 }, 'https://x.y');
    expect(p.body_html).toBe('<p>a &lt;b> &amp; c</p>');
    expect(p.variants[0].compare_at_price).toBeNull();
  });
  it('gives categories a stable positive numeric id', () => {
    const a = mapCategoryToCollection({ slug: 'hair-oil', name: 'Hair Oil' }, 'https://x.y');
    const b = mapCategoryToCollection({ slug: 'hair-oil', name: 'Hair Oil' }, 'https://x.y');
    expect(a.id).toBe(b.id);
    expect(a.id).toBeGreaterThan(0);
    expect(mapCategoryToCollection({ id: 7, slug: 's', name: 'S' }, 'https://x.y').id).toBe(7);
  });
  it('parses 1-based paging with clamps', () => {
    expect(parsePaging(new URLSearchParams('page=2&limit=10'))).toMatchObject({ from: 10, to: 20 });
    expect(parsePaging(new URLSearchParams(''))).toMatchObject({ page: 1, limit: 100, from: 0 });
    expect(parsePaging(new URLSearchParams('page=0&limit=9999')).limit).toBe(100);
  });
});

describe('mapShiprocketOrder', () => {
  it('maps a completed prepaid order from the documented webhook shape', () => {
    const m = mapShiprocketOrder(docOrder())!;
    expect(m.isComplete).toBe(true);
    expect(m.txnId).toBe('SR-686233cd1ff136306c2bf410');
    expect(m.lines).toEqual([{ id: 35, quantity: 2 }]);
    expect(m.paymentMethod).toBe('online');
    expect(m.totalPayable).toBe(1586.68);
    expect(m.amountPaid).toBe(1586.68);
    expect(m.couponCodes).toEqual(['GP2K']);
  });
  it('uses the real top-level phone, not the masked address phone', () => {
    const m = mapShiprocketOrder(docOrder())!;
    expect(m.phone).toBe('6302017947');
    expect(m.shipping.phone).toBe('6302017947');
    expect(m.shipping.fullName).toBe('Asha Rao');
    expect(m.shipping.houseNumber).toBe('Flat 4');
    expect(m.shipping.checkoutSource).toBe('shiprocket');
  });
  it('treats a pure COD order as nothing collected online', () => {
    const m = mapShiprocketOrder(docOrder({ payment_type: 'CASH_ON_DELIVERY', payment_status: 'Pending', payments: [], cod_charges: 49, total_amount_payable: 1000 }))!;
    expect(m.paymentMethod).toBe('cod');
    expect(m.amountPaid).toBe(0);
    expect(m.codCharges).toBe(49);
    expect(m.isComplete).toBe(true);
  });
  it('does not complete an order that is not SUCCESS', () => {
    for (const status of ['CREATED', 'INITIATED', 'FAILED']) {
      const m = mapShiprocketOrder(docOrder({ status }))!;
      expect(m.isComplete).toBe(false);
      expect(m.skipReason).toContain(status);
    }
  });
  it('does not complete a prepaid order whose payment did not succeed', () => {
    expect(mapShiprocketOrder(docOrder({ payment_status: 'Pending' }))!.isComplete).toBe(false);
  });
  it('does not complete an order with no recognisable items', () => {
    const m = mapShiprocketOrder(docOrder({ cart_data: { items: [{ variant_id: 'zzz', quantity: 1 }] } }))!;
    expect(m.isComplete).toBe(false);
    expect(m.skipReason).toBe('no_recognised_items');
  });
  it('accepts the Order Details API envelope and rejects bodies with no order id', () => {
    expect(mapShiprocketOrder({ ok: true, result: docOrder() })!.srOrderId).toBe('686233cd1ff136306c2bf410');
    expect(mapShiprocketOrder({ status: 'SUCCESS' })).toBeNull();
    expect(mapShiprocketOrder(null)).toBeNull();
  });
  it('sums only successful payments for a prepaid order', () => {
    const m = mapShiprocketOrder(docOrder({ payments: [
      { payment_status: 'Failed', amount_received: 999 },
      { payment_status: 'Success', amount_received: 1586.68 },
    ] }))!;
    expect(m.amountPaid).toBe(1586.68);
  });
});

describe('Shiprocket API calls', () => {
  const cfg = { enabled: true, configured: true, killed: false, apiKey: 'KEY', apiSecret: 'SECRET', apiBase: 'https://checkout-api.shiprocket.com' };
  const okResponse = (json: any) => ({ ok: true, status: 200, json: async () => json }) as any;

  it('signs the exact body it sends and builds the documented checkout payload', async () => {
    let seen: any;
    const fake: any = async (url: string, init: any) => { seen = { url, init }; return okResponse({ ok: true, result: { token: 'TOK', expires_at: 'x', data: { order_id: 'OID' } } }); };
    const r = await createCheckoutSession(cfg, {
      lines: [{ id: 15, quantity: 2 }],
      redirectUrl: 'https://vyraherbals.com/shiprocket/return',
      discount: { code: 'SAVE10', amount: 52.9 },
    }, fake);
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({ token: 'TOK', srOrderId: 'OID' });
    expect(seen.url).toBe('https://checkout-api.shiprocket.com/api/v1/access-token/checkout');
    expect(seen.init.headers['X-Api-Key']).toBe('KEY');
    expect(seen.init.headers['X-Api-HMAC-SHA256']).toBe(signPayload('SECRET', seen.init.body));
    const body = JSON.parse(seen.init.body);
    expect(body.cart_data.items).toEqual([{ variant_id: String(variantIdForProduct(15)), quantity: 2 }]);
    expect(body.cart_data.cart_discount).toEqual({ coupon_code: 'SAVE10', amount: 52.9 });
    expect(body.redirect_url).toBe('https://vyraherbals.com/shiprocket/return');
    expect(typeof body.timestamp).toBe('string');
  });
  it('omits cart_discount when there is no discount', async () => {
    let body: any;
    const fake: any = async (_u: string, init: any) => { body = JSON.parse(init.body); return okResponse({ ok: true, result: { token: 'T' } }); };
    await createCheckoutSession(cfg, { lines: [{ id: 1, quantity: 1 }], redirectUrl: 'https://x.y/r' }, fake);
    expect(body.cart_data.cart_discount).toBeUndefined();
  });
  it('reports failure when Shiprocket rejects or returns no token', async () => {
    const reject: any = async () => ({ ok: false, status: 511, json: async () => ({ message: 'Invalid HMAC' }) });
    expect((await createCheckoutSession(cfg, { lines: [{ id: 1, quantity: 1 }], redirectUrl: 'https://x.y/r' }, reject)).ok).toBe(false);
    const noTok: any = async () => okResponse({ ok: true, result: {} });
    expect((await createCheckoutSession(cfg, { lines: [{ id: 1, quantity: 1 }], redirectUrl: 'https://x.y/r' }, noTok)).ok).toBe(false);
  });
  it('survives a network error', async () => {
    const boom: any = async () => { throw new Error('ECONNRESET'); };
    const r = await fetchOrderDetails(cfg, 'abc123456', boom);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('ECONNRESET');
  });
  it('returns the order record from Order Details', async () => {
    let url = '';
    const fake: any = async (u: string) => { url = u; return okResponse({ ok: true, result: { order_id: 'abc123456' } }); };
    const r = await fetchOrderDetails(cfg, 'abc123456', fake);
    expect(url).toBe('https://checkout-api.shiprocket.com/api/v1/custom-platform-order/details');
    expect(r.data).toEqual({ order_id: 'abc123456' });
  });
});

describe('catalogue push webhooks (our site -> Shiprocket)', () => {
  const cfg = { enabled: true, configured: true, killed: false, apiKey: 'KEY', apiSecret: 'SECRET', apiBase: 'https://checkout-api.shiprocket.com' };
  const okResponse = (json: any) => ({ ok: true, status: 200, json: async () => json }) as any;

  it('posts the bare product to /wh/v1/custom/product, signed, with no extra fields', async () => {
    let seen: any;
    const fake: any = async (url: string, init: any) => { seen = { url, init }; return okResponse({}); };
    const product = { id: 15, title: 'Oil', variants: [] };
    const r = await pushProductWebhook(cfg, product, fake);
    expect(r.ok).toBe(true);
    expect(seen.url).toBe('https://checkout-api.shiprocket.com/wh/v1/custom/product');
    expect(seen.init.body).toBe(JSON.stringify(product));
    expect(seen.init.headers['X-Api-HMAC-SHA256']).toBe(signPayload('SECRET', seen.init.body));
    expect(seen.init.headers['X-Api-Key']).toBe('KEY');
  });
  it('posts a collection to /wh/v1/custom/collection', async () => {
    let url = '';
    const fake: any = async (u: string) => { url = u; return okResponse({}); };
    await pushCollectionWebhook(cfg, { id: 1, handle: 'hair-oil' }, fake);
    expect(url).toBe('https://checkout-api.shiprocket.com/wh/v1/custom/collection');
  });
  it('reports a Shiprocket rejection instead of throwing', async () => {
    const fake: any = async () => ({ ok: false, status: 511, json: async () => ({ message: 'Invalid HMAC' }) });
    const r = await pushProductWebhook(cfg, { id: 1 }, fake);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(511);
  });
  it('reports a network failure instead of throwing', async () => {
    const fake: any = async () => { throw new Error('boom'); };
    const r = await pushProductWebhook(cfg, { id: 1 }, fake);
    expect(r.ok).toBe(false);
  });
});
