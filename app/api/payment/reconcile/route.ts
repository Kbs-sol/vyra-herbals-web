import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { verifyEasebuzzTransaction } from '@/utils/easebuzz';
import { finalizeOrderFromSession } from '@/utils/orderFinalize';
import { SUCCESSFUL_ORDER_STATUSES } from '@/utils/orderStatus';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 60;

type ReconcileOutcome =
  | { txnid: string; status: 'created' | 'already_exists'; order_id?: any }
  | { txnid: string; status: 'pending' | 'failed' | 'skipped'; reason: string };

/**
 * Reconcile pending Easebuzz transactions whose surl callback never landed.
 *
 * When a customer pays but their browser drops the redirect back to
 * /api/payment/success (closed tab, lost network, mobile background-kill),
 * we still have:
 *   - a `transactions` row with status='created'
 *   - an `order_sessions` row with the cart + shipping payload
 *   - the customer's money at Easebuzz
 * ...but no `orders` row, no iCarry shipment, and no way for the order to
 * appear in the dashboard.
 *
 * This endpoint asks Easebuzz directly whether each pending transaction
 * actually succeeded, and if so calls finalizeOrderFromSession (the same code
 * path the surl callback uses) so the recovery is byte-for-byte identical to a
 * normal post-payment flow.
 *
 * Auth:
 *  - GET ?txnid=X is open; anyone can poll for the status of their own txn
 *    (the worst they can do is force a verify with Easebuzz, which is fine).
 *  - POST { all: true } requires either an admin user or the CRON_SECRET
 *    header so the Vercel cron can sweep without a session.
 */
const reconcileOne = async (supabase: any, txn: any): Promise<ReconcileOutcome> => {
  const txnid = String(txn.id);

  // Skip only if a *genuinely successful* order already exists for this txn.
  // A 'Failed' order (legacy data) must NOT count as "already placed" — that is
  // exactly what used to redirect abandoned payments to the success page.
  const { data: existing } = await supabase
    .from('orders')
    .select('id, order_id')
    .eq('txn_id', txnid)
    .in('status', SUCCESSFUL_ORDER_STATUSES as unknown as string[])
    .limit(1);
  if (existing?.length) {
    // Make sure the transactions row reflects the linked order even if a prior
    // attempt forgot to. Cheap, idempotent.
    if (txn.status !== 'success' || !txn.order_id) {
      await supabase.from('transactions').update({
        status: 'success',
        txn_id: txnid,
        order_id: existing[0].order_id,
      }).eq('id', txn.id);
    }
    return { txnid, status: 'already_exists', order_id: existing[0].order_id };
  }

  if (!txn.email || !txn.phone || !txn.amount) {
    return { txnid, status: 'skipped', reason: 'transactions row missing email/phone/amount' };
  }

  const verify = await verifyEasebuzzTransaction({
    txnid,
    amount: txn.amount,
    email: txn.email,
    phone: txn.phone,
  });

  if (!verify.ok) {
    return { txnid, status: 'failed', reason: verify.reason };
  }
  if (verify.status !== 'success') {
    // Not actually paid. Distinguish a terminal failure (mark dead, tell the
    // client to stop polling) from a still-in-flight payment ('pending').
    const terminal = verify.status === 'failure' || verify.status === 'bounced'
      || verify.status === 'userCancelled' || verify.status === 'dropped';
    if (terminal) {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', txn.id);
      return { txnid, status: 'failed', reason: `Easebuzz status=${verify.status}` };
    }
    return { txnid, status: 'pending', reason: `Easebuzz status=${verify.status}` };
  }

  const result = await finalizeOrderFromSession(supabase, txnid, {
    paymentAmount: verify.amount ?? txn.amount,
    paymentMethod: 'online',
  });

  if (!result.ok) {
    return { txnid, status: 'failed', reason: result.reason };
  }
  return {
    txnid,
    status: result.alreadyExisted ? 'already_exists' : 'created',
    order_id: result.order?.order_id || result.order?.id,
  };
};

const getCallerAuth = async (req: Request, supabase: any) => {
  const cronHeader = req.headers.get('x-cron-secret') || '';
  const cronSecret = process.env.CRON_SECRET || '';
  if (cronSecret && cronHeader === cronSecret) return { isCron: true, isAdmin: false };

  // Vercel cron sends Authorization: Bearer <CRON_SECRET> automatically.
  const auth = req.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    if (cronSecret && token === cronSecret) return { isCron: true, isAdmin: false };
    const { data: { user: authUser } } = await supabase.auth.getUser(token);
    if (authUser) {
      const { data: u } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle();
      return { isCron: false, isAdmin: u?.role === 2, userId: authUser.id };
    }
  }
  return { isCron: false, isAdmin: false };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const txnid = searchParams.get('txnid');
  if (!txnid) {
    return NextResponse.json({ error: 'txnid required' }, { status: 400 });
  }
  const supabase = createServerSupabase();
  const { data: txn, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', Number(txnid))
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!txn) {
    return NextResponse.json({ error: 'transaction not found' }, { status: 404 });
  }
  const outcome = await reconcileOne(supabase, txn);
  return NextResponse.json({ outcome });
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const body = await req.json().catch(() => ({} as any));
  const auth = await getCallerAuth(req, supabase);

  if (body?.all === true) {
    if (!auth.isCron && !auth.isAdmin) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    // Sweep transactions stuck in 'created' that have a matching order_sessions
    // row but no orders row yet. We bound the sweep to the most recent 50 so a
    // single cron tick can't OOM or blow the 60s budget — anything older will
    // be picked up by the next tick.
    const { data: pending, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'created')
      .eq('payment_method', 'online')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const outcomes: ReconcileOutcome[] = [];
    for (const txn of pending || []) {
      try {
        outcomes.push(await reconcileOne(supabase, txn));
      } catch (e) {
        outcomes.push({ txnid: String(txn.id), status: 'failed', reason: (e as Error).message });
      }
    }
    return NextResponse.json({ status: 'ok', count: outcomes.length, outcomes });
  }

  const txnid = body?.txnid ? String(body.txnid) : null;
  if (!txnid) {
    return NextResponse.json({ error: 'txnid required (or set { all: true } with admin/cron auth)' }, { status: 400 });
  }
  const { data: txn, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', Number(txnid))
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!txn) {
    return NextResponse.json({ error: 'transaction not found' }, { status: 404 });
  }
  const outcome = await reconcileOne(supabase, txn);
  return NextResponse.json({ outcome });
}
