import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireUser } from '@/utils/apiAuth';
import { enforceRateLimit } from '@/utils/rateLimit';
import crypto from 'crypto';

// Easebuzz rejects payloads as "Parameter validation failed" when fields contain
// characters outside their allowlist. Mobile keyboards, autocorrect, voice input,
// and Chrome autofill regularly inject smart quotes (’ ), em-dashes (—), unicode
// spaces ( ), or trailing whitespace — invisible on the form but lethal to
// Easebuzz's regex validator. We sanitize aggressively here so the gateway only
// ever sees its allowlisted character sets.
const sanitizeFirstname = (raw: unknown): string => {
  // Easebuzz allows letters, spaces, and periods. Strip everything else, collapse
  // whitespace, trim. Cap at 60 chars (Easebuzz's documented max is 60).
  return String(raw ?? '')
    .normalize('NFKD')                    // smart quotes / accents -> base form
    .replace(/[^A-Za-z .]/g, '')          // drop disallowed chars
    .replace(/\s+/g, ' ')                 // collapse runs of whitespace
    .trim()
    .slice(0, 60);
};

const sanitizeEmail = (raw: unknown): string => {
  return String(raw ?? '')
    .replace(/\s+/g, '')                  // emails never contain whitespace
    .trim()
    .slice(0, 80);
};

const sanitizePhone = (raw: unknown): string => {
  // Strip non-digits, drop leading 91/0 country prefixes, take last 10 digits.
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(-10);
};

const sanitizeProductinfo = (raw: unknown): string => {
  // Easebuzz accepts a fairly narrow set here. Allow alphanumerics, common safe
  // punctuation, and spaces — anything else (em-dashes, ₹, emojis, asterisks) gets
  // dropped because we've seen those reliably trigger Parameter validation failed.
  return String(raw ?? '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9 ._,\-\/()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'Vyra Herbals Order';
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawFirstname = body?.firstname;
    const rawEmail = body?.email;
    const rawPhone = body?.phone;
    const rawProductinfo = body?.productinfo;
    const rawAmount = body?.amount;

    const firstname = sanitizeFirstname(rawFirstname);
    const email = sanitizeEmail(rawEmail);
    const phone = sanitizePhone(rawPhone);
    const productinfo = sanitizeProductinfo(rawProductinfo);

    // Validate required fields AFTER sanitization (raw input might have looked OK
    // but become empty after we stripped disallowed chars). Each error message
    // names the field so the inline modal banner is actionable on mobile too.
    const fieldErrors: string[] = [];
    if (!firstname) fieldErrors.push('Full name (letters only)');
    if (!email) fieldErrors.push('email');
    if (!phone) fieldErrors.push('phone');
    if (!productinfo) fieldErrors.push('product info');
    if (fieldErrors.length) {
      return NextResponse.json({ error: `Please fix: ${fieldErrors.join(', ')}` }, { status: 400 });
    }

    if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const numericAmount = Number(rawAmount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount < 1) {
      return NextResponse.json({ error: 'Payment amount must be at least ₹1.' }, { status: 400 });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Phone must be a 10-digit Indian mobile number starting with 6-9.' }, { status: 400 });
    }

    // From here, work only with the sanitized values. Aliasing rawAmount so the
    // existing transaction insert below stays unchanged.
    const amount = numericAmount;

    const supabase = createServerSupabase();

    // Checkout requires a signed-in customer, so a transaction should never be
    // opened anonymously. This also attaches the row to a real user, which is
    // what lets /api/payment/session verify the amount against its owner.
    const auth = await requireUser(req, supabase);
    if ('response' in auth) return auth.response;
    const userId = auth.user.id;

    // Each attempt writes a transaction row and hits the gateway.
    const limited = enforceRateLimit(req, 'payment:access', 20, 10 * 60 * 1000, userId);
    if (limited) return limited;

    // Create transaction record.
    // Manually generate the ID since the DB auto-increment is missing. A bare
    // millisecond timestamp collides when two checkouts land in the same
    // millisecond and the insert then fails on the primary key, so mix in a few
    // random digits while keeping the value time-sortable.
    const now = Date.now();
    const generatedId = now * 1000 + Math.floor(Math.random() * 1000);

    // We can use the generated ID as the numeric ID
    const { data: inserted, error } = await supabase.from('transactions').insert([
      {
        id: generatedId,
        user_id: userId,
        amount,
        firstname,
        email,
        phone,
        productinfo,
        status: 'created',
        payment_method: 'online', // Default to online for this route
        created_at: new Date().toISOString()
      }
    ]).select();

    if (error) {
      console.error('Payment access error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const txn = inserted?.[0];
    let txnId = String(txn?.id || `TXN${Date.now()}`);

    // Easebuzz txnid has a 40 character limit. If it's a UUID, it's 36.
    // If we have a prefix, ensure it doesn't exceed 40.
    if (txnId.length > 40) txnId = txnId.slice(-40);

    // Easebuzz Integration
    const key = (process.env.EASEBUZZ_KEY || '').trim();
    const salt = (process.env.EASEBUZZ_SALT || '').trim();
    const env = (process.env.EASEBUZZ_ENV || 'test').trim();

    if (!key || !salt || key.includes('REPLACE') || salt.includes('REPLACE')) {
      console.warn('Easebuzz keys are missing or invalid.');
      return NextResponse.json({
        error: 'Payment gateway configuration missing. Please check server logs.'
      }, { status: 500 });
    }

    const baseUrl = env === 'prod'
      ? 'https://pay.easebuzz.in/payment/initiateLink'
      : 'https://testpay.easebuzz.in/payment/initiateLink';

    // Easebuzz expects amount as a float with two decimal places (e.g. 10.00)
    const formattedAmount = Number(amount).toFixed(2);

    // Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = `${key}|${txnId}|${formattedAmount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const paymentData = new URLSearchParams();
    paymentData.append('key', key);
    paymentData.append('txnid', txnId);
    paymentData.append('amount', formattedAmount);
    paymentData.append('productinfo', productinfo);
    paymentData.append('firstname', firstname);
    paymentData.append('email', email);
    paymentData.append('phone', phone);
    paymentData.append('hash', hash);
    // Determine Base URL for callbacks (surl/furl)
    const origin = new URL(req.url).origin;
    let appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();

    // 1. Prefer localhost if request is from localhost (Local Development)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      appUrl = origin;
    }
    // 2. Fallback if App URL is missing or incorrect (Supabase)
    else if (!appUrl || appUrl.includes('supabase.co')) {
      appUrl = 'https://vyraherbals.com';
    }
    paymentData.append('surl', `${appUrl}/api/payment/success`);
    paymentData.append('furl', `${appUrl}/api/payment/failure`);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: paymentData
    });

    const result = await response.json();

    if (result.status === 1) {
      const payBaseUrl = (process.env.EASEBUZZ_ENV || 'test') === 'prod'
        ? 'https://pay.easebuzz.in/pay/'
        : 'https://testpay.easebuzz.in/pay/';
      return NextResponse.json({
        txnid: txnId,
        data: result.data,
        paymentUrl: `${payBaseUrl}${result.data}`
      });
    } else {
      // Surface the sanitized payload alongside Easebuzz's response in logs so we
      // can diagnose any future "Parameter validation failed" without guessing.
      // `result.data` is usually a one-line error like "Parameter validation
      // failed"; `error_desc` (when present) names the specific field.
      console.error('Easebuzz Error:', result, {
        sentFields: { firstname, email, phone, productinfo, amount: formattedAmount },
      });
      const easebuzzMsg = result?.error_desc || result?.error || result?.data || 'Payment initiation failed';
      return NextResponse.json({ error: String(easebuzzMsg) }, { status: 400 });
    }

  } catch (err) {
    console.error('Payment access exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
