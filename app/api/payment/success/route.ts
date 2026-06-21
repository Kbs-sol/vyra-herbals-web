import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { finalizeOrderFromSession } from '@/utils/orderFinalize';
import { verifyEasebuzzCallbackHash, verifyEasebuzzTransaction } from '@/utils/easebuzz';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 30;

const resolveAppUrl = (req: Request): string => {
    const origin = new URL(req.url).origin;
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin;
    }
    if (!appUrl || appUrl.includes('supabase.co')) {
        return 'https://vyraherbals.com';
    }
    return appUrl;
};

export async function POST(req: Request) {
    const appUrl = resolveAppUrl(req);
    try {
        const formData = await req.formData();
        const data: Record<string, any> = {};
        formData.forEach((value, k) => { data[k] = value; });

        const status = String(data.status || '');
        const txnid = data.txnid ? String(data.txnid) : '';

        if (!txnid) {
            return NextResponse.redirect(`${appUrl}/cart?error=missing_transaction`, 303);
        }

        const supabase = createServerSupabase();

        // ---- AUTHENTICATE THE CALLBACK BEFORE TRUSTING IT --------------------
        // Easebuzz signs every callback with a reverse hash over the merchant
        // salt. Without checking it, anyone could POST `status=success&txnid=…`
        // here and mint a paid order for free. We require EITHER a valid signed
        // hash with status=success, OR — as a fallback for any hashing edge case
        // (field formatting, additional_charges, etc.) — an authoritative
        // "success" from Easebuzz's retrieve API. Only then do we finalize.
        const hashOk = verifyEasebuzzCallbackHash(data);
        let paymentConfirmed = hashOk && status === 'success';

        if (!paymentConfirmed) {
            // Pull the stored transaction so we can re-verify with Easebuzz using
            // the email/phone/amount we captured at checkout time.
            const { data: txn } = await supabase
                .from('transactions')
                .select('amount, email, phone, status')
                .eq('id', Number(txnid))
                .maybeSingle();

            const verify = await verifyEasebuzzTransaction({
                txnid,
                amount: (data.amount as any) ?? txn?.amount ?? 0,
                email: String(data.email || txn?.email || ''),
                phone: String(data.phone || txn?.phone || ''),
            });
            paymentConfirmed = verify.ok && verify.status === 'success';

            if (!paymentConfirmed) {
                // Not a genuine successful payment. Record the failure (without
                // clobbering an already-successful txn) and DO NOT create an order.
                console.warn(
                    `[payment/success] rejected txn ${txnid}: hashOk=${hashOk} status=${status} verify=${verify.ok ? verify.status : verify.reason}`
                );
                if (txn && txn.status !== 'success') {
                    await supabase.from('transactions').update({ status: 'failed' }).eq('id', Number(txnid));
                }
                const reason = status && status !== 'success'
                    ? 'Payment was not completed.'
                    : 'We could not verify this payment.';
                return NextResponse.redirect(
                    `${appUrl}/payment-failed?order_id=${encodeURIComponent(txnid)}&reason=${encodeURIComponent(reason)}`,
                    303
                );
            }
        }

        // ---- PAYMENT IS GENUINE — create the durable order -------------------
        const result = await finalizeOrderFromSession(supabase, txnid, {
            paymentAmount: (data.amount as any) ?? null,
            paymentMethod: 'online',
        });

        if (!result.ok) {
            // Payment succeeded but we couldn't build the order row right now.
            // The reconcile cron will retry with the same (verified) txn, so the
            // customer's money is safe — route them somewhere actionable.
            if (result.reason === 'session_not_found') {
                return NextResponse.redirect(`${appUrl}/cart?error=session_not_found`, 303);
            }
            return NextResponse.redirect(
                `${appUrl}/cart?error=order_creation_failed&details=${encodeURIComponent(result.reason)}`,
                303
            );
        }

        const successUrl = result.order?.id
            ? `${appUrl}/order-placed/${result.order.id}`
            : `${appUrl}/profile?toast=order_success#orders`;
        return NextResponse.redirect(successUrl, 303);
    } catch (err) {
        console.error('Payment success exception:', err);
        return NextResponse.redirect(`${appUrl}/cart?error=payment_error`, 303);
    }
}
