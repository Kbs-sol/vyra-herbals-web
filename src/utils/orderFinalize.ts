import { validateCoupon, recordCouponUsage } from '@/utils/coupons';
import { syncOrderShipment } from '@/utils/orderShipment';
import {
  notifyOrderPlaced,
  notifyPaymentConfirmed,
} from '@/services/communications/integration/orderNotifications';
import { SUCCESSFUL_ORDER_STATUSES } from '@/utils/orderStatus';

export type FinalizeResult =
  | { ok: true; order: any; alreadyExisted: boolean; trackingId: string }
  | { ok: false; reason: string };

/**
 * Idempotently turn an `order_sessions` payload into a durable `orders` row,
 * apply coupon usage, clear the cart, sync to iCarry, and update the
 * `transactions` row. This is the single source of truth for the post-payment
 * flow — both the Easebuzz surl callback (/api/payment/success) and the
 * reconcile endpoint (/api/payment/reconcile) call into here so the two paths
 * cannot drift apart.
 *
 * `paymentAmount` and `paymentMethod` are the values reported by the payment
 * gateway. They're optional because the surl POST has them on hand but the
 * reconcile path may not — in that case we fall back to the session payload.
 */
export const finalizeOrderFromSession = async (
  supabase: any,
  txnIdStr: string,
  opts: { paymentAmount?: number | string | null; paymentMethod?: string | null } = {}
): Promise<FinalizeResult> => {
  // Idempotency check: did a prior call already create a *successful* order?
  // Restricting to successful statuses means a stale 'Failed' row (legacy data)
  // can never be returned as the finalized order — finalize is only ever called
  // once payment is confirmed, so the correct action is to create the real one.
  const { data: existingOrders, error: existingErr } = await supabase
    .from('orders')
    .select('*')
    .eq('txn_id', txnIdStr)
    .in('status', SUCCESSFUL_ORDER_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingErr) {
    console.error('[finalizeOrderFromSession] existing order lookup failed:', existingErr);
  }

  let inserted: any = existingOrders?.[0] || null;
  let orderData: any = null;
  let alreadyExisted = !!inserted;

  if (!inserted) {
    const { data: sessions, error: sessionError } = await supabase
      .from('order_sessions')
      .select('payload, created_at')
      .eq('txn_id', txnIdStr)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessionError || !sessions?.length) {
      console.error('[finalizeOrderFromSession] session lookup failed:', sessionError);
      return { ok: false, reason: 'session_not_found' };
    }

    orderData = sessions[0].payload;

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
          (sum: number, item: any) => sum + (item.price * item.quantity),
          0
        );
        welcomeCouponDiscount = Math.round(itemsTotal * discountPercent / 100);
        welcomeCouponApplied = true;
      }
    }

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
      }
    }

    const now = new Date();
    const generatedId = now.getTime();
    const generatedOrderId = `ORD-${generatedId}`;

    const orderPayload = {
      id: generatedId,
      order_id: generatedOrderId,
      items: orderData.orderItems,
      total_amount: orderData.totalAmount || opts.paymentAmount || 0,
      transaction_price: orderData.transactionPrice || 0,
      shipping_data: orderData.shippingData,
      payment_method: orderData.paymentMethod || opts.paymentMethod || 'online',
      status: 'placed',
      txn_id: txnIdStr,
      user_id: orderData.userId,
      created_at: now.toISOString(),
      order_date: now.toISOString(),
      welcome_coupon_applied: welcomeCouponApplied,
      welcome_coupon_discount: welcomeCouponDiscount,
      coupon_code: appliedCouponCode,
      coupon_discount: appliedCouponDiscount,
      delivery_status: 'Pending Sync',
    };

    const { data: createdOrder, error: insertError } = await supabase
      .from('orders')
      .insert([orderPayload])
      .select()
      .single();

    if (insertError) {
      console.error('[finalizeOrderFromSession] order insert failed:', insertError);
      return { ok: false, reason: `order_creation_failed: ${insertError.message}` };
    }

    inserted = createdOrder;

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

  // Clear cart for the buyer (idempotent — fine to run on the retry path too).
  const userIdForCart = orderData?.userId || inserted?.user_id;
  if (userIdForCart) {
    await supabase.from('cart').delete().eq('user_id', userIdForCart);
  }

  // iCarry sync. Skipped if shipment_id already present so a retry of finalize
  // never creates a duplicate shipment on iCarry's side.
  let trackingId = '';
  if (inserted && !inserted.shipment_id) {
    const syncWithCeiling = Promise.race([
      syncOrderShipment(supabase, inserted),
      new Promise<{ success: false; message: string }>((resolve) =>
        setTimeout(
          () => resolve({ success: false, message: 'iCarry sync ceiling hit in finalize' }),
          25000
        )
      ),
    ]);
    try {
      const result = await syncWithCeiling;
      if (result.success) trackingId = (result as any).trackingId || '';
      else console.warn(`[finalizeOrderFromSession] iCarry sync incomplete for order ${inserted.id}: ${result.message}`);
    } catch (syncErr) {
      console.error(`[finalizeOrderFromSession] iCarry sync threw for order ${inserted.id}:`, syncErr);
    }
  } else if (inserted?.shipment_id) {
    trackingId = inserted.tracking_id || '';
  }

  // Update the transactions row to reflect the confirmed payment.
  const paymentMethod = inserted?.payment_method || orderData?.paymentMethod || opts.paymentMethod || 'online';
  const orderIdentifier = inserted?.order_id || null;
  try {
    await supabase.from('transactions').update({
      status: 'success',
      txn_id: txnIdStr,
      order_id: orderIdentifier,
      payment_method: paymentMethod,
    }).eq('id', Number(txnIdStr));
  } catch (e) {
    console.warn(`[finalizeOrderFromSession] transactions update failed for ${txnIdStr}:`, e);
  }

  // WhatsApp notifications for the prepaid flow. Wired here rather than in
  // /api/payment/success so the reconcile paths (/api/payment/reconcile and the
  // reconcile cron) notify too — all three finalize through this function.
  //
  // Guarded on `!alreadyExisted` so replaying finalize for an order that was
  // already created doesn't message the customer twice. The queue's
  // `dedupe_key` would swallow the duplicate regardless; this just avoids
  // doing the work. Neither call can throw.
  if (inserted && !alreadyExisted) {
    await notifyOrderPlaced(inserted);
    await notifyPaymentConfirmed(inserted);
  }

  return { ok: true, order: inserted, alreadyExisted, trackingId };
};
