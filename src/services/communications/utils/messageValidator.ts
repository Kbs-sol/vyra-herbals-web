import { ValidationError } from './errors';
import type { OutboundMessage } from '@/types/communications';

const MAX_PARAM_LENGTH = 1024; // Meta truncates/rejects overly long template params

export function validateOutboundMessage(message: OutboundMessage): void {
  if (!message.customer_phone || !/^\d{10,15}$/.test(message.customer_phone)) {
    throw new ValidationError(
      `Outbound message has an invalid customer_phone: "${message.customer_phone}"`
    );
  }

  if (!message.template_name) {
    throw new ValidationError('Outbound message is missing template_name');
  }

  if (!message.order_id) {
    throw new ValidationError('Outbound message is missing order_id');
  }

  for (const [key, value] of Object.entries(message.parameters ?? {})) {
    const asString = String(value);
    if (asString.length > MAX_PARAM_LENGTH) {
      throw new ValidationError(
        `Template parameter "${key}" exceeds ${MAX_PARAM_LENGTH} characters`
      );
    }
    // WhatsApp template params cannot contain newlines/tabs.
    if (/[\n\t]/.test(asString)) {
      throw new ValidationError(`Template parameter "${key}" contains illegal whitespace`);
    }
  }
}
