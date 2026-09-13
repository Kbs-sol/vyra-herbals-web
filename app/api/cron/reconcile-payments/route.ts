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

/**
 * Vercel cron hits this every 10 minutes. Verifies pending Easebuzz
 * transactions and creates the missing `orders` row + iCarry shipment for any
 * payment that actually succeeded.
 *
 * Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>` automatically
 * when CRON_SECRET is set as a project env var. Anyone hitting this without
 * that header gets 401.
 */
export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET || '';
    const auth = req.headers.get('Authorization') || '';
    const expected = `Bearer ${cronSecret}`;
    if (!cronSecret || auth !== expected) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabase();

    // Only sweep transactions that have had at least 2 minutes to settle —
    // anything fresher is likely still mid-flight in the normal surl callback.
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: pending, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'created')
        .eq('payment_method', 'online')
        .lte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const outcomes: any[] = [];
    for (const txn of pending || []) {
        const txnid = String(txn.id);
        try {
            // Skip only if a genuinely successful order already exists — a
            // legacy 'Failed' order must not block recovery or be treated as paid.
            const { data: existing } = await supabase
                .from('orders')
                .select('id, order_id')
                .eq('txn_id', txnid)
                .in('status', SUCCESSFUL_ORDER_STATUSES as unknown as string[])
                .limit(1);
            if (existing?.length) {
                await supabase.from('transactions').update({
                    status: 'success',
                    txn_id: txnid,
                    order_id: existing[0].order_id,
                }).eq('id', txn.id);
                outcomes.push({ txnid, status: 'already_exists' });
                continue;
            }

            if (!txn.email || !txn.phone || !txn.amount) {
                outcomes.push({ txnid, status: 'skipped', reason: 'missing email/phone/amount' });
                continue;
            }

            const verify = await verifyEasebuzzTransaction({
                txnid,
                amount: txn.amount,
                email: txn.email,
                phone: txn.phone,
            });

            if (!verify.ok) {
                outcomes.push({ txnid, status: 'verify_failed', reason: verify.reason });
                continue;
            }
            if (verify.status !== 'success') {
                if (
                    verify.status === 'failure' ||
                    verify.status === 'bounced' ||
                    verify.status === 'userCancelled' ||
                    verify.status === 'dropped'
                ) {
                    await supabase.from('transactions').update({ status: 'failed' }).eq('id', txn.id);
                }
                outcomes.push({ txnid, status: 'pending_at_gateway', gateway_status: verify.status });
                continue;
            }

            const result = await finalizeOrderFromSession(supabase, txnid, {
                paymentAmount: verify.amount ?? txn.amount,
                paymentMethod: 'online',
            });

            if (!result.ok) {
                outcomes.push({ txnid, status: 'finalize_failed', reason: result.reason });
            } else {
                outcomes.push({
                    txnid,
                    status: result.alreadyExisted ? 'already_exists' : 'recovered',
                    order_id: result.order?.order_id,
                });
                console.log(`[cron reconcile] recovered order ${result.order?.order_id} for txn ${txnid}`);
            }
        } catch (e) {
            outcomes.push({ txnid, status: 'exception', reason: (e as Error).message });
        }
    }

    return NextResponse.json({ status: 'ok', count: outcomes.length, outcomes });
}
