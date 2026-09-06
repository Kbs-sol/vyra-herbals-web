/**
 * Shared types for the communications / WhatsApp automation engine.
 * These augment (not replace) the project's existing src/types/index.ts.
 */

export type EventType =
  | 'ORDER_PLACED'
  | 'PAYMENT_CONFIRMED'
  | 'SHIPMENT_CREATED'
  | 'DELIVERY_STATUS_UPDATED'
  | 'REFUND_INITIATED'
  | 'MANUAL';

export type EventSource = 'api' | 'webhook' | 'cron' | 'manual';

export type MessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed_retry'
  | 'failed_permanent';

export type ProviderName = 'whatsapp';

/** Base shape every domain event must satisfy before it reaches the dispatcher. */
export interface BaseEvent {
  type: EventType;
  order_id: number;
  /** Set by the dispatcher, not required from the caller. */
  source?: EventSource;
  /** Arbitrary identifier to dedupe re-emitted events (defaults to `${type}:${order_id}`). */
  dedupe_key?: string;
}

export interface OrderItem {
  id: number | string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderPlacedEvent extends BaseEvent {
  type: 'ORDER_PLACED';
  // Supabase auth ids are UUID strings in this app; kept broad so callers can
  // pass the real customer id for audit without a coercion (handlers ignore it).
  user_id: number | string | null;
  customer_phone: string;
  customer_name: string;
  total_amount: number;
  payment_method: 'cod' | 'online';
  items: OrderItem[];
  tracking_link?: string;
}

export interface PaymentConfirmedEvent extends BaseEvent {
  type: 'PAYMENT_CONFIRMED';
  // Supabase auth ids are UUID strings in this app; kept broad so callers can
  // pass the real customer id for audit without a coercion (handlers ignore it).
  user_id: number | string | null;
  customer_phone: string;
  amount_paid: number;
  payment_gateway: string;
}

export interface ShipmentCreatedEvent extends BaseEvent {
  type: 'SHIPMENT_CREATED';
  customer_phone: string;
  tracking_id: string;
  courier_name: string;
  awb_code: string;
  label_url?: string;
}

export interface DeliveryStatusUpdatedEvent extends BaseEvent {
  type: 'DELIVERY_STATUS_UPDATED';
  customer_phone: string;
  new_status:
    | 'Picked up'
    | 'In Transit'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Delivery Failed';
  tracking_id: string;
}

export interface RefundInitiatedEvent extends BaseEvent {
  type: 'REFUND_INITIATED';
  customer_phone: string;
  refund_amount: number;
  reason?: string;
}

export type CommunicationEvent =
  | OrderPlacedEvent
  | PaymentConfirmedEvent
  | ShipmentCreatedEvent
  | DeliveryStatusUpdatedEvent
  | RefundInitiatedEvent;

/** A fully-built, provider-agnostic outbound message, ready to be queued/sent. */
export interface OutboundMessage {
  order_id: number;
  customer_phone: string;
  message_type: EventType;
  provider: ProviderName;
  template_name: string;
  parameters: Record<string, string | number>;
  /** Idempotency key — composite of order_id + message_type by default. */
  dedupe_key: string;
  scheduled_for?: Date;
}

export interface QueuedMessageRow {
  id: number;
  order_id: number | null;
  customer_phone: string;
  message_type: EventType;
  status: MessageStatus;
  provider: ProviderName;
  template_name: string;
  parameters: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  scheduled_for: string;
  created_at: string;
  processed_at: string | null;
  payload: Record<string, unknown>;
  dedupe_key: string;
}

export interface ProviderSendResult {
  success: boolean;
  message_id?: string;
  /** Raw provider response, stored for audit purposes. */
  raw?: unknown;
  error?: {
    message: string;
    status?: number;
    code?: string | number;
  };
}
