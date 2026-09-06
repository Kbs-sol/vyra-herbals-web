import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { automationEngine } from '@/services/communications';
import { tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily cron job to execute scheduled WhatsApp communication flows:
 * 1. 24-hour Registration Welcome Promo
 * 2. 60-day (2-month) Feedback Request post-order
 * 3. 90-day (3-month) Re-order Reminder post-order
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const now = new Date();
  const results = {
    registration_promos_sent: 0,
    feedback_requests_sent: 0,
    reorder_reminders_sent: 0,
    errors: [] as string[],
  };

  // 1. Send Registration Promo after 2 hours
  try {
    const minRegistrationTime = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const maxRegistrationTime = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

    const { data: users, error: userError } = await db
      .from('users')
      .select('id, name, email, phone, created_at')
      .gte('created_at', minRegistrationTime)
      .lte('created_at', maxRegistrationTime);

    if (!userError && users) {
      for (const u of users) {
        const phone = tryNormalizePhone(u.phone);
        if (phone) {
          await automationEngine.emit({
            type: 'MANUAL' as any,
            order_id: 0,
            customer_phone: phone,
            template_name: process.env.WHATSAPP_TEMPLATE_WELCOME_PROMO ?? 'welcome_promo_2hr',
            parameters: {
              customer_name: u.name || 'Customer',
            },
            dedupe_key: `PROMO_2HR:${u.id}`,
          } as any, 'cron');
          results.registration_promos_sent++;
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Registration promo error: ${err.message}`);
  }

  // 2. Send Feedback Request after 60 days (2 months)
  try {
    const min60Days = new Date(now.getTime() - 61 * 24 * 60 * 60 * 1000).toISOString();
    const max60Days = new Date(now.getTime() - 59 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders60, error: err60 } = await db
      .from('orders')
      .select('*')
      .gte('created_at', min60Days)
      .lte('created_at', max60Days)
      .neq('status', 'Failed');

    if (!err60 && orders60) {
      for (const order of orders60) {
        const shipping = typeof order.shipping_data === 'string' 
          ? JSON.parse(order.shipping_data || '{}') 
          : (order.shipping_data || {});
        const phone = tryNormalizePhone(shipping.phone || shipping.mobile);
        if (phone) {
          const customerName = String(shipping.fullName || shipping.name || 'Customer').trim();
          await automationEngine.emit({
            type: 'MANUAL' as any,
            order_id: Number(order.id),
            customer_phone: phone,
            template_name: process.env.WHATSAPP_TEMPLATE_FEEDBACK_REQUEST ?? 'feedback_request',
            parameters: {
              customer_name: customerName,
              order_id: String(order.order_id || order.id),
            },
            dedupe_key: `FEEDBACK_60D:${order.id}`,
          } as any, 'cron');
          results.feedback_requests_sent++;
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Feedback request error: ${err.message}`);
  }

  // 3. Send Re-order Reminder after 90 days (3 months)
  try {
    const min90Days = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const max90Days = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders90, error: err90 } = await db
      .from('orders')
      .select('*')
      .gte('created_at', min90Days)
      .lte('created_at', max90Days)
      .neq('status', 'Failed');

    if (!err90 && orders90) {
      for (const order of orders90) {
        const shipping = typeof order.shipping_data === 'string' 
          ? JSON.parse(order.shipping_data || '{}') 
          : (order.shipping_data || {});
        const phone = tryNormalizePhone(shipping.phone || shipping.mobile);
        if (phone) {
          const customerName = String(shipping.fullName || shipping.name || 'Customer').trim();
          await automationEngine.emit({
            type: 'MANUAL' as any,
            order_id: Number(order.id),
            customer_phone: phone,
            template_name: process.env.WHATSAPP_TEMPLATE_REORDER_REMINDER ?? 'reorder_reminder',
            parameters: {
              customer_name: customerName,
            },
            dedupe_key: `REORDER_90D:${order.id}`,
          } as any, 'cron');
          results.reorder_reminders_sent++;
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Reorder reminder error: ${err.message}`);
  }

  return NextResponse.json({ status: 'ok', results });
}
