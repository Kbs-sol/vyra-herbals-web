import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { validateCoupon, recordCouponUsage } from '@/utils/coupons';
import { syncOrderShipment } from '@/utils/orderShipment';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const status = formData.get('status');
        const txnid = formData.get('txnid');
        // const hash = formData.get('hash'); // Verify hash in production!

        if (status !== 'success') {
            const origin = new URL(req.url).origin;
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
            let errorMsg = formData.get('error_Message') || formData.get('error') || 'Payment failed or cancelled';
            return NextResponse.redirect(`${appUrl}/payment-failed?order_id=${txnid || ''}&reason=${encodeURIComponent(String(errorMsg))}`, 303);
        }

        const supabase = createServerSupabase();

        // Robust Base URL detection
        const origin = new URL(req.url).origin;
        let appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

        console.log(`[Payment Success] Origin: ${origin}, Initial AppUrl: ${appUrl}`);

        // Dynamic Redirection Logic:
        // 1. If running locally, ALWAYS trust the origin.
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            appUrl = origin;
            console.log('[Payment Success] Localhost detected. Using origin as AppUrl.');
        }
        // 2. If APP_URL is invalid (Supabase or empty), fallback.
        else if (!appUrl || appUrl.includes('supabase.co')) {
            if (origin.includes('vercel.app')) {
                appUrl = origin;
            } else {
                appUrl = 'https://vyra-herbals.vercel.app';
            }
            console.log(`[Payment Success] AppUrl corrected to: ${appUrl}`);
        } else {
            console.log(`[Payment Success] Using provided NEXT_PUBLIC_APP_URL: ${appUrl}`);
        }

        if (!txnid) {
            return NextResponse.redirect(`${appUrl}/cart?error=missing_transaction`, 303);
        }

        const txnIdStr = String(txnid);

        // Idempotency: if callback is retried by the gateway, reuse the existing order.
        const { data: existingOrders, error: existingOrderError } = await supabase
            .from('orders')
            .select('*')
            .eq('txn_id', txnIdStr)
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingOrderError) {
            console.error('[Payment Success] Existing order lookup failed:', existingOrderError);
        }

        let inserted: any = existingOrders?.[0] || null;
        let orderData: any = null;

        if (!inserted) {
            // 1. Get the latest session payload for this transaction.
            const { data: sessions, error: sessionError } = await supabase
                .from('order_sessions')
                .select('payload, created_at')
                .eq('txn_id', txnIdStr)
                .order('created_at', { ascending: false })
                .limit(1);

            if (sessionError || !sessions?.length) {
                console.error('Session lookup failed:', sessionError);
                return NextResponse.redirect(`${appUrl}/cart?error=session_not_found`, 303);
            }

            orderData = sessions[0].payload;

            // --- Welcome Coupon Server-Side Validation ---
            let welcomeCouponApplied = false;
            let welcomeCouponDiscount = 0;

            if (orderData.welcomeCouponApplied && orderData.userId) {
                const { data: settingsRow } = await supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'welcome_coupon')
                    .maybeSingle();

                const couponConfig = settingsRow?.value;

                const { count: orderCount } = await supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', orderData.userId);

                if (couponConfig?.enabled && (orderCount || 0) === 0) {
                    const discountPercent = couponConfig.discount_percent || 10;
                    const itemsTotal = (orderData.orderItems || []).reduce(
                        (sum: number, item: any) => sum + (item.price * item.quantity), 0
                    );
                    welcomeCouponDiscount = Math.round(itemsTotal * discountPercent / 100);
                    welcomeCouponApplied = true;
                    console.log(`[Payment Success] Welcome coupon applied: ${discountPercent}% = ₹${welcomeCouponDiscount} off`);
                } else {
                    console.log('[Payment Success] Welcome coupon validation failed');
                }
            }

            // --- Custom Coupon Server-Side Validation ---
            let appliedCouponCode: string | null = null;
            let appliedCouponDiscount = 0;
            let appliedCouponId: number | null = null;
            if (orderData.couponCode) {
                const result = await validateCoupon(
                    supabase,
                    orderData.couponCode,
                    orderData.orderItems || [],
                    orderData.userId || null
                );
                if (result.ok) {
                    appliedCouponCode = result.coupon.code;
                    appliedCouponDiscount = result.discount;
                    appliedCouponId = result.coupon.id;
                    console.log(`[Payment Success] Custom coupon applied: ${appliedCouponCode} = ₹${appliedCouponDiscount} off`);
                } else {
                    console.log(`[Payment Success] Custom coupon rejected: ${result.reason}`);
                }
            }

            // 2. Insert into orders
            const now = new Date();
            const generatedId = now.getTime(); // Match COD logic
            const generatedOrderId = `ORD-${generatedId}`;

            // NOTE: Ensure user_id and txn_id columns exist in the orders table!
            const orderPayload = {
                id: generatedId,
                order_id: generatedOrderId,
                items: orderData.orderItems,
                total_amount: orderData.totalAmount || formData.get('amount') || 0,
                transaction_price: orderData.transactionPrice || 0,
                shipping_data: orderData.shippingData,
                payment_method: orderData.paymentMethod || 'online',
                status: 'placed',
                txn_id: txnIdStr,
                user_id: orderData.userId,
                created_at: now.toISOString(),
                order_date: now.toISOString(),
                welcome_coupon_applied: welcomeCouponApplied,
                welcome_coupon_discount: welcomeCouponDiscount,
                coupon_code: appliedCouponCode,
                coupon_discount: appliedCouponDiscount,
            };

            const { data: createdOrder, error: insertError } = await supabase
                .from('orders')
                .insert([{ ...orderPayload, delivery_status: 'Pending Sync' }])
                .select()
                .single();

            if (insertError) {
                console.error('Order creation failed:', insertError);
                return NextResponse.redirect(`${appUrl}/cart?error=order_creation_failed&details=${encodeURIComponent(insertError.message)}`, 303);
            }

            inserted = createdOrder;

            // Record coupon usage now that the order is durably created
            if (appliedCouponId && appliedCouponDiscount > 0) {
                await recordCouponUsage(
                    supabase,
                    appliedCouponId,
                    orderData.userId || null,
                    inserted?.id || null,
                    appliedCouponDiscount
                );
            }
        }

        // 3. Clear cart? 
        const userIdForCart = orderData?.userId || inserted?.user_id;
        if (userIdForCart) {
            await supabase.from('cart').delete().eq('user_id', userIdForCart);
        }

        // 4. Create shipment in iCarry without auto-assignment.
        // The order is already stamped with delivery_status='Pending Sync' so a Vercel
        // function timeout here still leaves a recoverable state that /api/orders/sync-shipment
        // (or the user's profile page on next load) can pick up and retry.
        //
        // syncOrderShipment has its own 24s hard ceiling (see orderShipment.ts).
        // We wrap it in *one more* race against a 25s timeout here so that even
        // if Supabase writes inside sync hang, the user still gets redirected to
        // /profile within Vercel's 30s budget instead of seeing a 504.
        // Static import (above) instead of `await import(...)` — the dynamic
        // form was inexplicably skipping the sync on Vercel even though the
        // utility itself worked when called directly via /api/debug-db/icarry-ping.
        let trackingId = '';
        console.log(`[Payment Success] Starting iCarry sync for order ${inserted?.id}, shipment_id=${inserted?.shipment_id}`);
        if (inserted && !inserted.shipment_id) {
            const syncWithCeiling = Promise.race([
                syncOrderShipment(supabase, inserted),
                new Promise<{ success: false; message: string }>((resolve) =>
                    setTimeout(
                        () => resolve({ success: false, message: 'iCarry sync ceiling hit in success handler' }),
                        25000
                    )
                ),
            ]);
            try {
                const result = await syncWithCeiling;
                if (result.success) trackingId = (result as any).trackingId || '';
                else console.warn(`[Payment Success] iCarry sync did not complete for order ${inserted.id}: ${result.message}`);
            } catch (syncErr) {
                // Never let a sync exception block the redirect — the row stays in
                // 'Pending Sync' and the profile page will retry on next load.
                console.error(`[Payment Success] iCarry sync threw for order ${inserted.id}:`, syncErr);
            }
        } else if (inserted?.shipment_id) {
            trackingId = inserted.tracking_id || '';
            console.log(`[Payment Success] Shipment already exists for order ${inserted.id}, skipping re-creation.`);
        }

        // 5. Update transaction status and link to order
        // We match by 'id' because that's what we sent as 'txnid' to Easebuzz
        const paymentMethod = inserted?.payment_method || orderData?.paymentMethod || 'online';
        const orderIdentifier = inserted?.order_id || null;

        await supabase.from('transactions').update({
            status: 'success',
            txn_id: txnIdStr,
            order_id: orderIdentifier,
            payment_method: paymentMethod
        }).eq('id', Number(txnIdStr));

        // 6. Redirect to Order page or Profile
        return NextResponse.redirect(`${appUrl}/profile?toast=order_success#orders`, 303);

    } catch (err) {
        console.error('Payment success exception:', err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
