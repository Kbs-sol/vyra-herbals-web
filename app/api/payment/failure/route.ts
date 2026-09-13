import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { verifyEasebuzzCallbackHash } from '@/utils/easebuzz';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';

const resolveAppUrl = (req: Request): string => {
    const origin = new URL(req.url).origin;
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
    if (!appUrl || appUrl.includes('supabase.co')) return 'https://vyraherbals.com';
    return appUrl;
};

export async function POST(req: Request) {
    const appUrl = resolveAppUrl(req);
    try {
        const formData = await req.formData();
        const data: Record<string, any> = {};
        formData.forEach((value, k) => { data[k] = value; });

        const txnid = data.txnid ? String(data.txnid) : '';
        const errorMsg = String(data.error_Message || data.error || 'Payment failed or cancelled');

        if (!txnid) {
            return NextResponse.redirect(`${appUrl}/payment-failed?reason=${encodeURIComponent(errorMsg)}`, 303);
        }

        const supabase = createServerSupabase();

        // A failed/abandoned payment is NOT an order. We deliberately do NOT
        // create an `orders` row here — doing so used to make abandoned
        // payments surface as "Order Placed Successfully" on the confirmation
        // page and inflate admin revenue. We only flag the transaction so the
        // dashboard and reconcile sweep know it's dead.
        //
        // Only flip to 'failed' when the row isn't already 'success' (guards the
        // rare race where the surl success callback landed first).
        const hashOk = verifyEasebuzzCallbackHash(data);
        const { data: txn } = await supabase
            .from('transactions')
            .select('status')
            .eq('id', Number(txnid))
            .maybeSingle();

        if (txn && txn.status !== 'success') {
            await supabase
                .from('transactions')
                .update({ status: 'failed', payment_method: 'online' })
                .eq('id', Number(txnid));
        }
        if (!hashOk) {
            console.warn(`[payment/failure] unsigned/forged failure callback for txn ${txnid}`);
        }

        return NextResponse.redirect(
            `${appUrl}/payment-failed?order_id=${encodeURIComponent(txnid)}&reason=${encodeURIComponent(errorMsg)}`,
            303
        );
    } catch (err) {
        console.error('Payment failure exception:', err);
        return NextResponse.redirect(`${appUrl}/payment-failed?reason=payment_failed`, 303);
    }
}
