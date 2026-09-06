import { BaseEventHandler } from './base';
import type { RefundInitiatedEvent, OutboundMessage } from '@/types/communications';
import { tryNormalizePhone } from '../../utils/phoneNormalizer';
import { getTemplate } from '../../config/templates';
import { logger } from '../../logging/logger';
import { pickOrdered } from './paramOrdering';

export class RefundInitiatedHandler extends BaseEventHandler<RefundInitiatedEvent> {
  readonly eventType = 'REFUND_INITIATED' as const;

  buildMessage(event: RefundInitiatedEvent): OutboundMessage | null {
    const phone = tryNormalizePhone(event.customer_phone);
    if (!phone) {
      logger.warn('refund_initiated_skipped_invalid_phone', { order_id: event.order_id });
      return null;
    }

    const template = getTemplate('REFUND_INITIATED');
    const values = {
      order_id: event.order_id,
      refund_amount: event.refund_amount.toFixed(2),
    };

    return {
      order_id: event.order_id,
      customer_phone: phone,
      message_type: 'REFUND_INITIATED',
      provider: 'whatsapp',
      template_name: template.name,
      parameters: pickOrdered(values, template.parameterOrder),
      dedupe_key: event.dedupe_key ?? `REFUND_INITIATED:${event.order_id}`,
    };
  }
}

export const refundInitiatedHandler = new RefundInitiatedHandler();
