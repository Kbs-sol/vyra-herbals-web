import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function handleTracking(from: string, session: WhatsAppSession) {
  // Reset state to avoid getting stuck
  if (session.state !== 'IDLE') {
    await updateSession(from, { state: 'IDLE', context: {} });
  }

  const db = getSupabaseAdmin();

  // Normalize: get 10-digit phone
  const cleanDigits = from.replace(/\D/g, '');
  const tenDigit = cleanDigits.slice(-10);
  const withCountry = `91${tenDigit}`;

  // Query orders by shipping_data phone, full phone with country, or shipping_address text
  let { data: orders } = await db
    .from('orders')
    .select('id, order_id, status, created_at, order_date, total_amount, awb_code, tracking_id, shipment_id, courier_name, delivery_status, shipping_data, shipping_address')
    .or(`shipping_data->>phone.eq.${tenDigit},shipping_data->>phone.eq.${withCountry},shipping_address.ilike.%${tenDigit}%`)
    .order('created_at', { ascending: false })
    .limit(3);

  // Fallback: check session context for confirmed_order_id or draft_order_id
  if (!orders || orders.length === 0) {
    const contextOrderId = session.context?.confirmed_order_id || session.context?.draft_order_id;
    if (contextOrderId) {
      const { data: contextOrder } = await db
        .from('orders')
        .select('id, order_id, status, created_at, order_date, total_amount, awb_code, tracking_id, shipment_id, courier_name, delivery_status, shipping_data, shipping_address')
        .eq('id', contextOrderId)
        .maybeSingle();
      if (contextOrder) {
        orders = [contextOrder];
      }
    }
  }

  if (!orders || orders.length === 0) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: `🔍 We couldn't find any recent orders associated with your number (+91 ${tenDigit}).\n\nIf you ordered with a different phone number or need help, tap below:` },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Main Menu' } },
            { type: 'reply', reply: { id: 'CUSTOMER_SUPPORT', title: '💬 Contact Support' } },
          ]
        }
      }
    });
    return;
  }

  // Attempt background sync for any order missing AWB & shipment_id
  for (const o of orders) {
    if (!o.awb_code && !o.shipment_id) {
      try {
        const { syncOrderShipment } = await import('@/utils/orderShipment');
        const res = await syncOrderShipment(db, o);
        if (res.success && res.trackingId) {
          o.awb_code = res.trackingId;
          o.tracking_id = res.trackingId;
          o.shipment_id = res.shipmentId;
        }
      } catch {}
    }
  }

  let text = "📦 *Your Recent Orders:*\n\n";
  let primaryTrackingUrl = '';
  let primaryButtonTitle = 'Track Order ↗';

  for (const o of orders) {
    const rawAwb = String(o.awb_code || o.tracking_id || '').trim();
    const awb = (!rawAwb.startsWith('ORD-') && rawAwb !== String(o.id)) ? rawAwb : '';
    const dateStr = new Date(o.created_at || o.order_date || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    text += `*Order #${o.id}*\n`;
    text += `• Date: ${dateStr}\n`;
    text += `• Status: ${formatStatus(o.status)}\n`;

    if (o.courier_name) {
      text += `• Courier: ${o.courier_name}\n`;
    }

    if (awb) {
      const icarryUrl = `https://www.icarry.in/track-shipment?awb=${encodeURIComponent(awb)}`;
      text += `• *AWB / Tracking ID:* \`${awb}\`\n`;
      text += `👉 *Track on iCarry:* ${icarryUrl}\n`;
      if (o.courier_name?.toLowerCase().includes('xpressbees')) {
        text += `👉 Xpressbees: https://www.xpressbees.com/track?awb=${encodeURIComponent(awb)}\n`;
      } else if (o.courier_name?.toLowerCase().includes('delhivery')) {
        text += `👉 Delhivery: https://www.delhivery.com/track/package/${encodeURIComponent(awb)}\n`;
      }

      if (!primaryTrackingUrl) {
        primaryTrackingUrl = icarryUrl;
        primaryButtonTitle = 'Track on iCarry ↗';
      }
    } else {
      const siteUrl = `https://vyraherbals.com/track-order?order_id=${o.id}`;
      text += `• *AWB / Tracking:* Being assigned by courier\n`;
      text += `👉 *Track on Vyra:* ${siteUrl}\n`;

      if (!primaryTrackingUrl) {
        primaryTrackingUrl = siteUrl;
        primaryButtonTitle = 'Track Order ↗';
      }
    }

    text += `\n`;
  }

  text += `_Tap the button below or link above to view live updates._\n`;

  // Send interactive CTA URL button (opens tracking page directly in 1 tap)
  const ctaResult = await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      header: { type: 'text', text: '📦 Order Tracking' },
      body: { text: text.trim().substring(0, 1024) },
      footer: { text: 'Type Menu to shop • Help for support' },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: primaryButtonTitle,
          url: primaryTrackingUrl,
        }
      }
    }
  });

  // Fallback to interactive reply buttons if cta_url is not accepted by WhatsApp client
  if (!ctaResult || !ctaResult.success) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: text.trim().substring(0, 1024) },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Main Menu' } },
            { type: 'reply', reply: { id: 'CUSTOMER_SUPPORT', title: '💬 Contact Support' } },
          ]
        }
      }
    });
  }
}

function formatStatus(status: string) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'pending': return '🟡 Pending Payment';
    case 'placed': return '🟢 Order Confirmed';
    case 'confirmed': return '🟢 Confirmed';
    case 'processing': return '⚙️ Processing';
    case 'shipped': return '🚚 Shipped';
    case 'delivered': return '✅ Delivered';
    case 'failed': return '❌ Cancelled / Failed';
    default: return status || '🟢 Placed';
  }
}

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  });
}
