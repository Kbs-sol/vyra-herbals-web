import { BaseEventHandler } from './base';
import type { PaymentConfirmedEvent, OutboundMessage } from '@/types/communications';
import { tryNormalizePhone } from '../../utils/phoneNormalizer';
import { getTemplate } from '../../config/templates';
import { logger } from '../../logging/logger';
import { pickOrdered } from './paramOrdering';

export class PaymentConfirmedHandler extends BaseEventHandler<PaymentConfirmedEvent> {
  readonly eventType = 'PAYMENT_CONFIRMED' as const;

  buildMessage(event: PaymentConfirmedEvent): OutboundMessage | null {
    const phone = tryNormalizePhone(event.customer_phone);
    if (!phone) {
      logger.warn('payment_confirmed_skipped_invalid_phone', { order_id: event.order_id });
      return null;
    }

    const template = getTemplate('PAYMENT_CONFIRMED');
    const values = {
      order_id: event.order_id,
      amount_paid: event.amount_paid.toFixed(2),
    };

    return {
      order_id: event.order_id,
      customer_phone: phone,
      message_type: 'PAYMENT_CONFIRMED',
      provider: 'whatsapp',
      template_name: template.name,
      parameters: pickOrdered(values, template.parameterOrder),
      dedupe_key: event.dedupe_key ?? `PAYMENT_CONFIRMED:${event.order_id}`,
    };
  }
}

export const paymentConfirmedHandler = new PaymentConfirmedHandler();
