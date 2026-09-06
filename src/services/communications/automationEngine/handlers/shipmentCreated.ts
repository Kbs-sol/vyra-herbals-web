import { BaseEventHandler } from './base';
import type { ShipmentCreatedEvent, OutboundMessage } from '@/types/communications';
import { tryNormalizePhone } from '../../utils/phoneNormalizer';
import { getTemplate } from '../../config/templates';
import { logger } from '../../logging/logger';
import { pickOrdered } from './paramOrdering';

export class ShipmentCreatedHandler extends BaseEventHandler<ShipmentCreatedEvent> {
  readonly eventType = 'SHIPMENT_CREATED' as const;

  buildMessage(event: ShipmentCreatedEvent): OutboundMessage | null {
    const phone = tryNormalizePhone(event.customer_phone);
    if (!phone) {
      logger.warn('shipment_created_skipped_invalid_phone', { order_id: event.order_id });
      return null;
    }

    const template = getTemplate('SHIPMENT_CREATED');
    const values = {
      order_id: event.order_id,
      courier_name: event.courier_name,
      awb_code: event.awb_code,
      tracking_id: event.tracking_id,
    };

    return {
      order_id: event.order_id,
      customer_phone: phone,
      message_type: 'SHIPMENT_CREATED',
      provider: 'whatsapp',
      template_name: template.name,
      parameters: pickOrdered(values, template.parameterOrder),
      dedupe_key: event.dedupe_key ?? `SHIPMENT_CREATED:${event.order_id}`,
    };
  }
}

export const shipmentCreatedHandler = new ShipmentCreatedHandler();
