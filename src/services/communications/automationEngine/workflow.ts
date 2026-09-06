import type { EventType } from '@/types/communications';
import type { EventHandler } from './types';
import { orderPlacedHandler } from './handlers/orderPlaced';
import { paymentConfirmedHandler } from './handlers/paymentConfirmed';
import { shipmentCreatedHandler } from './handlers/shipmentCreated';
import { deliveryStatusUpdatedHandler } from './handlers/deliveryStatusUpdated';
import { refundInitiatedHandler } from './handlers/refundInitiated';
import { FEATURE_FLAGS } from '../config/providers';

/**
 * Single source of truth for event -> handler routing. Adding a new event
 * type means: add the type to src/types/communications.ts, write a handler,
 * register it here, add its template + feature flag — nothing else in the
 * dispatcher needs to change.
 */
const HANDLERS: Partial<Record<EventType, EventHandler<any>>> = {
  ORDER_PLACED: orderPlacedHandler,
  PAYMENT_CONFIRMED: paymentConfirmedHandler,
  SHIPMENT_CREATED: shipmentCreatedHandler,
  DELIVERY_STATUS_UPDATED: deliveryStatusUpdatedHandler,
  REFUND_INITIATED: refundInitiatedHandler,
};

export function getHandler(eventType: EventType): EventHandler<any> {
  const handler = HANDLERS[eventType];
  if (!handler) {
    throw new Error(`No handler registered for event type: ${eventType}`);
  }
  return handler;
}

export function isFeatureEnabled(eventType: EventType): boolean {
  const flag = FEATURE_FLAGS[eventType];
  return flag ? flag() : true;
}
