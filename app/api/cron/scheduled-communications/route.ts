import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { messageQueue } from '@/services/communications';
import { sendQueuedMessage } from '@/services/communications/queue/messageSender';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';
import { tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily cron job to execute scheduled WhatsApp communication flows:
 * 1. 3-hour Registration Welcome Promo (welcome_promo_3hr)
 * 2. 60-day (2-month) Feedback Request post-order (feedback_request)
 * 3. 90-day (3-month) Re-order Reminder post-order (reorder_reminder)
 * 4. Abandoned Cart Day 2 nudge
 * 5. Abandoned Cart Day 9 nudge
 * 6. WhatsApp Draft Order Expiry (6 hours)
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req) && !(await verifyAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const now = new Date();
  const results = {
    registration_promos_sent: 0,
    feedback_requests_sent: 0,
    reorder_reminders_sent: 0,
    abandoned_carts_d2_sent: 0,
    abandoned_carts_d9_sent: 0,
    draft_orders_expired: 0,
    errors: [] as string[],
  };

  if (!whatsappClient.isEnabled()) {
    return NextResponse.json({
      status: 'skipped',
      message: 'WhatsApp provider disabled or not configured',
      results,
    });
  }

  // 1. Send Registration Promo for users registered at least 3 hours ago (up to 7 days ago)
  try {
    const minRegistrationTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const maxRegistrationTime = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

    const { data: users, error: userError } = await db
      .from('users')
      .select('id, name, email, phone, created_at')
      .gte('created_at', minRegistrationTime)
      .lte('created_at', maxRegistrationTime);

    if (userError) {
      results.errors.push(`Registration promo user fetch error: ${userError.message}`);
    } else if (users) {
      const templateName = process.env.WHATSAPP_TEMPLATE_WELCOME_PROMO ?? 'welcome_promo_3hr';
      for (const u of users) {
        const phone = tryNormalizePhone(u.phone);
        if (!phone) continue;

        const dedupeKey = `PROMO_3HR:${u.id}`;
        const existing = await messageQueue.findByDedupeKey(dedupeKey);
        if (existing) continue; // Already queued or sent

        const customerName = (u.name && u.name.trim()) ? u.name.trim() : 'Customer';

        try {
          const queued = await messageQueue.enqueue({
            order_id: 0,
            customer_phone: phone,
            message_type: 'MANUAL',
            provider: 'whatsapp',
            template_name: templateName,
            parameters: [customerName],
            dedupe_key: dedupeKey,
          });

          const outcome = await sendQueuedMessage(queued, whatsappClient);
          if (outcome === 'sent') {
            results.registration_promos_sent++;
          } else {
            results.errors.push(`Promo send returned ${outcome} for user ${u.id}`);
          }
        } catch (sendErr: any) {
          results.errors.push(`Promo send error for user ${u.id}: ${sendErr.message}`);
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Registration promo error: ${err.message}`);
  }

  // 2. Send Feedback Request after 60 days (lookback 60 to 70 days)
  try {
    const min60Days = new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000).toISOString();
    const max60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders60, error: err60 } = await db
      .from('orders')
      .select('*')
      .gte('created_at', min60Days)
      .lte('created_at', max60Days)
      .neq('status', 'Failed');

    if (err60) {
      results.errors.push(`Feedback request order fetch error: ${err60.message}`);
    } else if (orders60) {
      const templateName = process.env.WHATSAPP_TEMPLATE_FEEDBACK_REQUEST ?? 'feedback_request';
      for (const order of orders60) {
        const shipping = typeof order.shipping_data === 'string' 
          ? JSON.parse(order.shipping_data || '{}') 
          : (order.shipping_data || {});
        const phone = tryNormalizePhone(shipping.phone || shipping.mobile);
        if (!phone) continue;

        const dedupeKey = `FEEDBACK_60D:${order.id}`;
        const existing = await messageQueue.findByDedupeKey(dedupeKey);
        if (existing) continue;

        const customerName = String(shipping.fullName || shipping.name || 'Customer').trim() || 'Customer';

        try {
          const queued = await messageQueue.enqueue({
            order_id: Number(order.id),
            customer_phone: phone,
            message_type: 'MANUAL',
            provider: 'whatsapp',
            template_name: templateName,
            parameters: [customerName, String(order.order_id || order.id)],
            dedupe_key: dedupeKey,
          });

          const outcome = await sendQueuedMessage(queued, whatsappClient);
          if (outcome === 'sent') {
            results.feedback_requests_sent++;
          } else {
            results.errors.push(`Feedback send returned ${outcome} for order ${order.id}`);
          }
        } catch (sendErr: any) {
          results.errors.push(`Feedback send error for order ${order.id}: ${sendErr.message}`);
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Feedback request error: ${err.message}`);
  }

  // 3. Send Re-order Reminder after 90 days (lookback 90 to 100 days)
  try {
    const min90Days = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const max90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders90, error: err90 } = await db
      .from('orders')
      .select('*')
      .gte('created_at', min90Days)
      .lte('created_at', max90Days)
      .neq('status', 'Failed');

    if (err90) {
      results.errors.push(`Reorder reminder order fetch error: ${err90.message}`);
    } else if (orders90) {
      const templateName = process.env.WHATSAPP_TEMPLATE_REORDER_REMINDER ?? 'reorder_reminder';
      for (const order of orders90) {
        const shipping = typeof order.shipping_data === 'string' 
          ? JSON.parse(order.shipping_data || '{}') 
          : (order.shipping_data || {});
        const phone = tryNormalizePhone(shipping.phone || shipping.mobile);
        if (!phone) continue;

        const dedupeKey = `REORDER_90D:${order.id}`;
        const existing = await messageQueue.findByDedupeKey(dedupeKey);
        if (existing) continue;

        const customerName = String(shipping.fullName || shipping.name || 'Customer').trim() || 'Customer';

        try {
          const queued = await messageQueue.enqueue({
            order_id: Number(order.id),
            customer_phone: phone,
            message_type: 'MANUAL',
            provider: 'whatsapp',
            template_name: templateName,
            parameters: [customerName],
            dedupe_key: dedupeKey,
          });

          const outcome = await sendQueuedMessage(queued, whatsappClient);
          if (outcome === 'sent') {
            results.reorder_reminders_sent++;
          } else {
            results.errors.push(`Reorder send returned ${outcome} for order ${order.id}`);
          }
        } catch (sendErr: any) {
          results.errors.push(`Reorder send error for order ${order.id}: ${sendErr.message}`);
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Reorder reminder error: ${err.message}`);
  }

  // 4. Abandoned Cart Day 2 nudge
  try {
    const min2Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const max2Days = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data: abandonedCartsD2, error: d2Error } = await db
      .from('abandoned_carts')
      .select('*')
      .eq('status', 'open')
      .eq('opted_in', true)
      .eq('reminders_sent', 0)
      .gte('last_activity_at', min2Days)
      .lte('last_activity_at', max2Days);

    // Also get anon_carts if they have a phone in context, but for simplicity, let's assume we do that as well.
    // The prompt says "Also query anon_carts if we can get a phone from context"
    const { data: anonCartsD2, error: anonD2Error } = await db
      .from('anon_carts')
      .select('*')
      .eq('status', 'open')
      .eq('opted_in', true)
      .eq('reminders_sent', 0)
      .gte('last_activity_at', min2Days)
      .lte('last_activity_at', max2Days);

    const allCartsD2 = [...(abandonedCartsD2 || []), ...(anonCartsD2 || [])];

    if (d2Error || anonD2Error) {
      results.errors.push(`Abandoned cart D2 fetch error`);
    } else if (allCartsD2.length > 0) {
      for (const cart of allCartsD2) {
        let phone = cart.phone;
        if (!phone && cart.context && typeof cart.context === 'object') {
          phone = cart.context.phone || cart.context.mobile;
        }
        phone = tryNormalizePhone(phone);
        if (!phone) continue;

        const dedupeKey = `ABANDONED_CART_D2:${cart.id}`;
        const existing = await messageQueue.findByDedupeKey(dedupeKey);
        if (existing) continue;

        let customerName = 'there';
        if (cart.context?.name || cart.context?.fullName) {
          customerName = String(cart.context.name || cart.context.fullName).trim();
        }

        const cartTotal = cart.cart_total || 0;

        try {
          const queued = await messageQueue.enqueue({
            order_id: 0,
            customer_phone: phone,
            message_type: 'MANUAL',
            provider: 'whatsapp',
            template_name: 'abandoned_cart',
            parameters: [customerName, String(cartTotal)],
            dedupe_key: dedupeKey,
          });

          const outcome = await sendQueuedMessage(queued, whatsappClient);
          if (outcome === 'sent') {
            results.abandoned_carts_d2_sent++;
            
            // Update reminders_sent = 1
            const table = cart.user_id ? 'abandoned_carts' : 'anon_carts';
            await db.from(table).update({ reminders_sent: 1, last_reminder_at: new Date().toISOString() }).eq('id', cart.id);
          } else {
            results.errors.push(`Abandoned cart D2 send returned ${outcome} for cart ${cart.id}`);
          }
        } catch (sendErr: any) {
          results.errors.push(`Abandoned cart D2 send error for cart ${cart.id}: ${sendErr.message}`);
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Abandoned cart D2 error: ${err.message}`);
  }

  // 5. Abandoned Cart Day 9 nudge
  try {
    const min9Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const max9Days = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString();

    const { data: abandonedCartsD9, error: d9Error } = await db
      .from('abandoned_carts')
      .select('*')
      .eq('status', 'open')
      .eq('opted_in', true)
      .eq('reminders_sent', 1)
      .gte('last_activity_at', min9Days)
      .lte('last_activity_at', max9Days);

    const { data: anonCartsD9, error: anonD9Error } = await db
      .from('anon_carts')
      .select('*')
      .eq('status', 'open')
      .eq('opted_in', true)
      .eq('reminders_sent', 1)
      .gte('last_activity_at', min9Days)
      .lte('last_activity_at', max9Days);

    const allCartsD9 = [...(abandonedCartsD9 || []), ...(anonCartsD9 || [])];

    if (d9Error || anonD9Error) {
      results.errors.push(`Abandoned cart D9 fetch error`);
    } else if (allCartsD9.length > 0) {
      for (const cart of allCartsD9) {
        let phone = cart.phone;
        if (!phone && cart.context && typeof cart.context === 'object') {
          phone = cart.context.phone || cart.context.mobile;
        }
        phone = tryNormalizePhone(phone);
        if (!phone) continue;

        const dedupeKey = `ABANDONED_CART_D9:${cart.id}`;
        const existing = await messageQueue.findByDedupeKey(dedupeKey);
        if (existing) continue;

        let customerName = 'there';
        if (cart.context?.name || cart.context?.fullName) {
          customerName = String(cart.context.name || cart.context.fullName).trim();
        }

        const cartTotal = cart.cart_total || 0;

        try {
          const queued = await messageQueue.enqueue({
            order_id: 0,
            customer_phone: phone,
            message_type: 'MANUAL',
            provider: 'whatsapp',
            template_name: 'abandoned_cart',
            parameters: [customerName, String(cartTotal)],
            dedupe_key: dedupeKey,
          });

          const outcome = await sendQueuedMessage(queued, whatsappClient);
          if (outcome === 'sent') {
            results.abandoned_carts_d9_sent++;
            
            // Update reminders_sent = 2
            const table = cart.user_id ? 'abandoned_carts' : 'anon_carts';
            await db.from(table).update({ reminders_sent: 2, last_reminder_at: new Date().toISOString() }).eq('id', cart.id);
          } else {
            results.errors.push(`Abandoned cart D9 send returned ${outcome} for cart ${cart.id}`);
          }
        } catch (sendErr: any) {
          results.errors.push(`Abandoned cart D9 send error for cart ${cart.id}: ${sendErr.message}`);
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Abandoned cart D9 error: ${err.message}`);
  }

  // 6. WhatsApp Draft Order Expiry (6 hours)
  try {
    const { data: awaitingPaymentSessions, error: awaitErr } = await db
      .from('whatsapp_sessions')
      .select('*')
      .eq('state', 'AWAITING_PAYMENT');

    if (awaitErr) {
      results.errors.push(`Draft expiry fetch error: ${awaitErr.message}`);
    } else if (awaitingPaymentSessions && awaitingPaymentSessions.length > 0) {
      for (const session of awaitingPaymentSessions) {
        if (!session.context || !session.context.payment_link_sent_at) continue;

        const sentAt = new Date(session.context.payment_link_sent_at);
        const hoursDiff = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > 6) {
          const phone = session.phone_number;
          const orderId = session.context.draft_order_id;
          
          const dedupeKey = `DRAFT_EXPIRED:${phone}:${orderId}`;
          const existing = await messageQueue.findByDedupeKey(dedupeKey);
          if (existing) continue;

          // Enqueue dummy message so we don't process again, though state change prevents it
          await messageQueue.enqueue({
            order_id: orderId || 0,
            customer_phone: phone,
            message_type: 'MANUAL',
            provider: 'whatsapp',
            template_name: 'system_dummy',
            parameters: [],
            dedupe_key: dedupeKey,
          });

          // Cancel draft order if exists
          if (orderId) {
            const { data: order } = await db.from('orders').select('status').eq('id', orderId).maybeSingle();
            if (order && order.status === 'pending') {
              await db.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
            }
          }

          // Reset session
          await db.from('whatsapp_sessions').update({ state: 'IDLE', context: {} }).eq('phone_number', phone);

          // Send message directly
          try {
            await whatsappClient.sendRaw({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: 'Your order has expired. Type Menu to start a new order.' }
            });
            results.draft_orders_expired++;
          } catch (e: any) {
            results.errors.push(`Error sending draft expiry message: ${e.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Draft order expiry error: ${err.message}`);
  }

  return NextResponse.json({ status: 'ok', results });
}
