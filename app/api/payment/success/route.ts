import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { finalizeOrderFromSession } from '@/utils/orderFinalize';

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
    try {
        const formData = await req.formData();
        const status = formData.get('status');
        const txnid = formData.get('txnid');
        const appUrl = resolveAppUrl(req);

        if (status !== 'success') {
            const errorMsg = formData.get('error_Message') || formData.get('error') || 'Payment failed or cancelled';
            return NextResponse.redirect(
                `${appUrl}/payment-failed?order_id=${txnid || ''}&reason=${encodeURIComponent(String(errorMsg))}`,
                303
            );
        }

        if (!txnid) {
            return NextResponse.redirect(`${appUrl}/cart?error=missing_transaction`, 303);
        }

        const supabase = createServerSupabase();
        const txnIdStr = String(txnid);

        const result = await finalizeOrderFromSession(supabase, txnIdStr, {
            paymentAmount: formData.get('amount') as any,
            paymentMethod: 'online',
        });

        if (!result.ok) {
            // Best-effort: even if we couldn't fully finalize, route the user
            // somewhere actionable. The reconcile cron will pick this up on the
            // next sweep and create the order without further user input.
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
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
