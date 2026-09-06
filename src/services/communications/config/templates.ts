import type { EventType } from '@/types/communications';
import type { TemplateDefinition } from './types';
import { TemplateNotFoundError } from '../utils/errors';

/**
 * Maps each event type to the WhatsApp template that should be sent for it.
 * `name` is resolved from env so ops can repoint to a different approved
 * template name without a code deploy. `parameterOrder` defines the exact
 * positional order handlers must populate `parameters` in.
 *
 * Partial because 'MANUAL' has no fixed template — /api/whatsapp/send takes
 * the template name straight from the admin's request body, so it never
 * resolves through here. getTemplate() throws for anything unregistered.
 */
function buildRegistry(): Partial<Record<EventType, TemplateDefinition>> {
  return {
    ORDER_PLACED: {
      name: process.env.WHATSAPP_TEMPLATE_ORDER_PLACED ?? 'order_placed',
      // No customer-facing tracking page exists in this app yet, and Meta
      // rejects/renders badly on blank placeholders — so the approved
      // `order_placed` template takes three params, not four. Add
      // 'tracking_link' back here the day a /track page ships.
      parameterOrder: ['customer_name', 'order_id', 'total_amount'],
    },
    PAYMENT_CONFIRMED: {
      name: process.env.WHATSAPP_TEMPLATE_PAYMENT_CONFIRMED ?? 'payment_confirmed',
      parameterOrder: ['order_id', 'amount_paid'],
    },
    SHIPMENT_CREATED: {
      name: process.env.WHATSAPP_TEMPLATE_SHIPMENT_CREATED ?? 'shipment_created',
      parameterOrder: ['order_id', 'courier_name', 'tracking_id', 'awb_code'],
    },
    DELIVERY_STATUS_UPDATED: {
      // Resolved dynamically per-status by resolveDeliveryTemplate() below;
      // this entry is the fallback / default.
      name: process.env.WHATSAPP_TEMPLATE_IN_TRANSIT ?? 'in_transit',
      parameterOrder: ['order_id', 'tracking_id'],
    },
    REFUND_INITIATED: {
      name: process.env.WHATSAPP_TEMPLATE_REFUND_INITIATED ?? 'refund_initiated',
      parameterOrder: ['order_id', 'refund_amount'],
    },
  };
}

const REGISTRY = buildRegistry();

export function getTemplate(eventType: EventType): TemplateDefinition {
  const template = REGISTRY[eventType];
  if (!template) throw new TemplateNotFoundError(eventType);
  return template;
}

const DELIVERY_STATUS_TEMPLATE_ENV: Record<string, string> = {
  'Picked up': 'WHATSAPP_TEMPLATE_SHIPMENT_PICKED',
  'In Transit': 'WHATSAPP_TEMPLATE_IN_TRANSIT',
  'Out for Delivery': 'WHATSAPP_TEMPLATE_OUT_FOR_DELIVERY',
  Delivered: 'WHATSAPP_TEMPLATE_DELIVERED',
  'Delivery Failed': 'WHATSAPP_TEMPLATE_DELIVERY_FAILED',
};

const DELIVERY_STATUS_DEFAULTS: Record<string, string> = {
  'Picked up': 'shipment_picked',
  'In Transit': 'in_transit',
  'Out for Delivery': 'out_for_delivery',
  Delivered: 'delivered',
  'Delivery Failed': 'delivery_failed',
};

/**
 * DELIVERY_STATUS_UPDATED fans out to one of five templates depending on
 * the specific status string, unlike every other event type which maps 1:1.
 */
export function resolveDeliveryStatusTemplate(status: string): TemplateDefinition {
  const envVar = DELIVERY_STATUS_TEMPLATE_ENV[status];
  const fallbackName = DELIVERY_STATUS_DEFAULTS[status];
  if (!envVar || !fallbackName) {
    throw new TemplateNotFoundError(`DELIVERY_STATUS_UPDATED:${status}`);
  }
  return {
    name: process.env[envVar] ?? fallbackName,
    parameterOrder: ['order_id', 'tracking_id'],
  };
}
