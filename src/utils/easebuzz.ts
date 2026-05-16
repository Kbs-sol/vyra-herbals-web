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
