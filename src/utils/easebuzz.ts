import crypto from 'crypto';

export type EasebuzzVerifyResult =
  | {
      ok: true;
      status: string;
      easepayid?: string;
      amount?: number;
      mode?: string;
      raw: any;
    }
  | { ok: false; reason: string; raw?: any };

const getEasebuzzCreds = () => {
  const key = (process.env.EASEBUZZ_KEY || '').trim();
  const salt = (process.env.EASEBUZZ_SALT || '').trim();
  const env = (process.env.EASEBUZZ_ENV || 'test').trim();
  if (!key || !salt || key.includes('REPLACE') || salt.includes('REPLACE')) {
    return null;
  }
  return { key, salt, env };
};

/** Constant-time hex compare so we never leak hash bytes via timing. */
const safeHexEqual = (a: string, b: string): boolean => {
  const aa = String(a || '').toLowerCase();
  const bb = String(b || '').toLowerCase();
  if (!aa || !bb || aa.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(aa, 'hex'), Buffer.from(bb, 'hex'));
  } catch {
    return false;
  }
};

/**
 * Verify the reverse-hash Easebuzz signs every surl/furl callback with. This is
 * how we know a POST to /api/payment/success genuinely came from Easebuzz and
 * wasn't forged by someone hitting our endpoint with `status=success` to mint a
 * free order.
 *
 * Easebuzz response hash (no additional_charges):
 *   sha512(salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 *
 * All the echoed fields (amount, productinfo, firstname, email) must be taken
 * verbatim from the callback body — Easebuzz computed the hash over exactly the
 * strings it is sending back to us.
 */
export const verifyEasebuzzCallbackHash = (data: Record<string, any>): boolean => {
  const creds = getEasebuzzCreds();
  if (!creds) return false;
  const { key, salt } = creds;

  const provided = String(data.hash || '');
  if (!provided) return false;

  const v = (k: string) => (data[k] == null ? '' : String(data[k]));
  const udf = (n: number) => v(`udf${n}`);

  const parts = [
    salt,
    v('status'),
    udf(10), udf(9), udf(8), udf(7), udf(6),
    udf(5), udf(4), udf(3), udf(2), udf(1),
    v('email'),
    v('firstname'),
    v('productinfo'),
    v('amount'),
    v('txnid'),
    key,
  ];
  const computed = crypto.createHash('sha512').update(parts.join('|')).digest('hex');
  return safeHexEqual(computed, provided);
};

// Easebuzz hosts the retrieve endpoint on the dashboard subdomain — pay.* is
// the gateway, dashboard.* is the merchant API. Probed against live creds
// (see commit history), v2.1 with `sha512(key|txnid|salt)` is the only working
// combination on prod. The `amount/email/phone` body params are required for
// validation even though they are not part of the hash.
const getEndpoint = (env: string): string => {
  return env === 'prod'
    ? 'https://dashboard.easebuzz.in/transaction/v2.1/retrieve'
    : 'https://testdashboard.easebuzz.in/transaction/v2.1/retrieve';
};

/**
 * Calls Easebuzz's retrieve-transaction API to get the authoritative payment
 * status for a merchant txnid. This is the trust anchor for reconciliation —
 * we never create an order from an order_sessions row unless Easebuzz confirms
 * the payment succeeded, otherwise a curious user could trigger free orders by
 * hitting /api/payment/reconcile with a known pending txnid.
 *
 * Response shape (success):
 *   { status: true, msg: [ { status: "success", easepayid, amount, mode, ... } ] }
 * Response shape (gateway error):
 *   { status: false, error_desc, validation_errors? }
 */
export const verifyEasebuzzTransaction = async (params: {
  txnid: string;
  amount: number | string;
  email: string;
  phone: string;
}): Promise<EasebuzzVerifyResult> => {
  const creds = getEasebuzzCreds();
  if (!creds) {
    return { ok: false, reason: 'Easebuzz credentials missing on server' };
  }
  const { key, salt, env } = creds;

  // Hash format is intentionally the simple form `key|txnid|salt` — Easebuzz's
  // v2.1 retrieve API does NOT include amount/email/phone in the hash even
  // though those fields are required in the request body.
  const hashStr = `${key}|${params.txnid}|${salt}`;
  const hash = crypto.createHash('sha512').update(hashStr).digest('hex');

  const body = new URLSearchParams();
  body.append('key', key);
  body.append('txnid', params.txnid);
  body.append('amount', Number(params.amount).toFixed(2));
  body.append('email', params.email);
  body.append('phone', params.phone);
  body.append('hash', hash);

  const url = getEndpoint(env);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await resp.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, reason: `non-JSON response from ${url}: ${text.slice(0, 200)}` };
    }

    // status === false: Easebuzz refused the call (bad hash, unknown txnid, etc.)
    if (json?.status === false || json?.status === 0) {
      const desc = String(json?.error_desc || json?.msg || '').toLowerCase();
      if (desc.includes('no record') || desc.includes('not found')) {
        // Treat as pending — gateway hasn't indexed it yet; safe to retry.
        return { ok: true, status: 'pending', raw: json };
      }
      return {
        ok: false,
        reason: `Easebuzz refused retrieve: ${json?.error_desc || JSON.stringify(json).slice(0, 200)}`,
        raw: json,
      };
    }

    // Successful retrieve. msg is an ARRAY of one item; pull its inner status.
    const items = Array.isArray(json?.msg) ? json.msg : (json?.msg ? [json.msg] : []);
    const item = items[0];
    if (!item) {
      return { ok: true, status: 'pending', raw: json };
    }

    const inner = String(item.status || '').toLowerCase();
    if (inner === 'success') {
      return {
        ok: true,
        status: 'success',
        easepayid: String(item.easepayid || ''),
        amount: Number(item.amount || params.amount),
        mode: item.mode || item.payment_mode,
        raw: json,
      };
    }
    return { ok: true, status: inner || 'pending', raw: json };
  } catch (err) {
    return { ok: false, reason: `fetch error from ${url}: ${(err as Error).message}` };
  }
};
