import { BaseEventHandler } from './base';
import type { OrderPlacedEvent, OutboundMessage } from '@/types/communications';
import { tryNormalizePhone } from '../../utils/phoneNormalizer';
import { getTemplate } from '../../config/templates';
import { logger } from '../../logging/logger';
import { pickOrdered } from './paramOrdering';

export class OrderPlacedHandler extends BaseEventHandler<OrderPlacedEvent> {
  readonly eventType = 'ORDER_PLACED' as const;

  buildMessage(event: OrderPlacedEvent): OutboundMessage | null {
    const phone = tryNormalizePhone(event.customer_phone);
    if (!phone) {
      logger.warn('order_placed_skipped_invalid_phone', {
        order_id: event.order_id,
        raw_phone: event.customer_phone,
      });
      return null;
    }

    const template = getTemplate('ORDER_PLACED');

    const values: Record<string, string | number> = {
      customer_name: (event.customer_name && event.customer_name !== 'Customer') ? event.customer_name : (event.customer_phone || 'Customer'),
      order_id: event.order_id,
      total_amount: event.total_amount ? Number(event.total_amount).toFixed(2) : '0.00',
      tracking_link: event.tracking_link ?? '',
    };

    return {
      order_id: event.order_id,
      customer_phone: phone,
      message_type: 'ORDER_PLACED',
      provider: 'whatsapp',
      template_name: template.name,
      parameters: pickOrdered(values, template.parameterOrder),
      dedupe_key: event.dedupe_key ?? `ORDER_PLACED:${event.order_id}`,
    };
  }
}

export const orderPlacedHandler = new OrderPlacedHandler();
