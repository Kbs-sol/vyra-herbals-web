import { BaseEventHandler } from './base';
import type { DeliveryStatusUpdatedEvent, OutboundMessage } from '@/types/communications';
import { tryNormalizePhone } from '../../utils/phoneNormalizer';
import { resolveDeliveryStatusTemplate } from '../../config/templates';
import { logger } from '../../logging/logger';
import { pickOrdered } from './paramOrdering';

export class DeliveryStatusUpdatedHandler extends BaseEventHandler<DeliveryStatusUpdatedEvent> {
  readonly eventType = 'DELIVERY_STATUS_UPDATED' as const;

  buildMessage(event: DeliveryStatusUpdatedEvent): OutboundMessage | null {
    const phone = tryNormalizePhone(event.customer_phone);
    if (!phone) {
      logger.warn('delivery_status_skipped_invalid_phone', { order_id: event.order_id });
      return null;
    }

    let template;
    try {
      template = resolveDeliveryStatusTemplate(event.new_status);
    } catch (err) {
      logger.warn('delivery_status_unmapped_status', {
        order_id: event.order_id,
        status: event.new_status,
      });
      return null;
    }

    const values = {
      order_id: event.order_id,
      tracking_id: event.tracking_id,
    };

    return {
      order_id: event.order_id,
      customer_phone: phone,
      message_type: 'DELIVERY_STATUS_UPDATED',
      provider: 'whatsapp',
      template_name: template.name,
      parameters: pickOrdered(values, template.parameterOrder),
      // Include the status in the dedupe key — each status transition for
      // the same order is a distinct notification, not a duplicate.
      dedupe_key: event.dedupe_key ?? `DELIVERY_STATUS_UPDATED:${event.order_id}:${event.new_status}`,
    };
  }
}

export const deliveryStatusUpdatedHandler = new DeliveryStatusUpdatedHandler();
