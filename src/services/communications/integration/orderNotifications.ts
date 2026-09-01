import { automationEngine } from '@/services/communications';
import type { OrderItem } from '@/types/communications';
import { canonicalDeliveryStatus } from '@/utils/icarryTracking';

/**
 * Bridge between this app's existing order/payment/shipment code and the
 * WhatsApp automation engine.
 *
 * Everything here is deliberately defensive: these functions are called from
 * inside the COD, payment-finalize and shipment-sync paths, where a thrown
 * exception would cost a real customer their order. So every function
 * swallows its own errors, and none of them are allowed to reject.
 *
 * `automationEngine.emit()` guards its own internals, but its first act is an
 * `await logEvent(...)` that sits OUTSIDE that try — a Supabase outage there
 * would reject. Hence the try/catch on every call below rather than trusting
 * emit() to be bulletproof.
 *
 * Note these are `await`ed by callers rather than fire-and-forget: on Vercel
 * the function instance can be frozen the moment the response is returned, so
 * a dangling promise may never enqueue the message at all.
 */

/**
 * `orders.shipping_data` is JSONB, but rows written by older code paths hold a
 * JSON *string* — src/utils/shipping.ts handles both, so we must too.
 */
export function readShippingData(order: any): Record<string, any> {
  const raw = order?.shipping_data;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

/** Map cart items onto the engine's OrderItem shape (`title` here, `name` there). */
function toOrderItems(items: any): OrderItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    id: item?.id ?? '',
    name: String(item?.title ?? item?.name ?? 'Item'),
    quantity: Number(item?.quantity) || 1,
    price: Number(item?.price) || 0,
  }));
}

function money(...candidates: unknown[]): number {
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/** "Order confirmed" — fires once per order, for both COD and prepaid. */
export async function notifyOrderPlaced(order: any): Promise<void> {
  try {
    if (!order?.id) return;
    const shipping = readShippingData(order);
    const customerName = String(shipping.fullName || shipping.name || shipping.first_name || '').trim() || 'Customer';

    await automationEngine.emit(
      {
        type: 'ORDER_PLACED',
        order_id: Number(order.id),
        user_id: order.user_id ?? null,
        customer_phone: String(shipping.phone ?? shipping.mobile ?? ''),
        customer_name: customerName,
        total_amount: money(order.total_amount),
        payment_method: order.payment_method === 'cod' ? 'cod' : 'online',
        items: toOrderItems(order.items),
      },
      'api'
    );
  } catch (err) {
    console.warn(`[WhatsApp] ORDER_PLACED notify failed for order ${order?.id}:`, err);
  }
}

/** "Payment received" — prepaid orders only; COD collects at the door. */
export async function notifyPaymentConfirmed(order: any): Promise<void> {
  try {
    if (!order?.id) return;
    const shipping = readShippingData(order);

    await automationEngine.emit(
      {
        type: 'PAYMENT_CONFIRMED',
        order_id: Number(order.id),
        user_id: order.user_id ?? null,
        customer_phone: String(shipping.phone ?? ''),
        // transaction_price is what was actually charged online; total_amount
        // is the order value. For prepaid they match, but prefer the charge.
        amount_paid: money(order.transaction_price, order.total_amount),
        payment_gateway: 'Easebuzz',
      },
      'api'
    );
  } catch (err) {
    console.warn(`[WhatsApp] PAYMENT_CONFIRMED notify failed for order ${order?.id}:`, err);
  }
}

/**
 * "Shipment booked" — skipped unless iCarry issued a real AWB.
 *
 * iCarry shipments are created with `save_only=1`, so the usual case is a
 * shipment with no courier and no AWB until an admin assigns one in iCarry's
 * UI (`delivery_status: 'Unassigned'`). iCarry still hands back a `trackingId`
 * in that state, but it's just the internal shipment id — useless to a
 * customer, and the courier name would be blank. Messaging then would mean a
 * near-empty template, so we stay quiet and let the delivery-status sync take
 * over from pickup onwards. Skipping also keeps a Meta round-trip out of the
 * checkout request, which is already racing iCarry inside a 30s budget.
 */
export async function notifyShipmentCreated(
  order: any,
  shipment: {
    trackingId?: string | null;
    awb_code?: string | null;
    courier_name?: string | null;
  }
): Promise<void> {
  try {
    if (!order?.id) return;

    const awb = String(shipment.awb_code ?? '').trim();
    if (!awb) return; // no courier assigned yet — nothing trackable to send

    const trackingId = String(shipment.trackingId ?? '').trim() || awb;
    const shipping = readShippingData(order);

    await automationEngine.emit(
      {
        type: 'SHIPMENT_CREATED',
        order_id: Number(order.id),
        customer_phone: String(shipping.phone ?? ''),
        tracking_id: trackingId,
        courier_name: String(shipment.courier_name ?? '').trim() || 'our courier partner',
        awb_code: awb,
      },
      'api'
    );
  } catch (err) {
    console.warn(`[WhatsApp] SHIPMENT_CREATED notify failed for order ${order?.id}:`, err);
  }
}

/**
 * Delivery progress — takes iCarry's raw free-text status and only messages
 * the customer when it maps onto one of the five approved templates.
 * `dedupe_key` includes the canonical status, so each distinct transition
 * sends once no matter how often the sync runs.
 */
export async function notifyDeliveryStatusChanged(
  order: any,
  rawStatus: string,
  source: 'api' | 'cron' = 'api'
): Promise<void> {
  try {
    if (!order?.id) return;

    const status = canonicalDeliveryStatus(rawStatus);
    if (!status) return; // booked/pending/label-created — not customer-facing

    const shipping = readShippingData(order);

    await automationEngine.emit(
      {
        type: 'DELIVERY_STATUS_UPDATED',
        order_id: Number(order.id),
        customer_phone: String(shipping.phone ?? ''),
        new_status: status,
        tracking_id: String(order.tracking_id ?? order.awb_code ?? '').trim(),
      },
      source
    );
  } catch (err) {
    console.warn(`[WhatsApp] DELIVERY_STATUS_UPDATED notify failed for order ${order?.id}:`, err);
  }
}
