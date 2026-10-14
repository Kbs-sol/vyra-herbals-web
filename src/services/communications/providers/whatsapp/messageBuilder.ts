import type { OutboundMessage } from '@/types/communications';
import type { WhatsAppSendPayload, WhatsAppTemplateComponent } from './types';
import { validateOutboundMessage } from '../../utils/messageValidator';

const DEFAULT_LANGUAGE_CODE = 'en';

/**
 * Converts our provider-agnostic OutboundMessage into the exact JSON body
 * Meta's Cloud API expects for a template message.
 *
 * Template parameter ORDER matters to Meta (positional {{1}}, {{2}}, ...),
 * so each handler is responsible for putting `parameters` keys in the
 * correct order. We preserve insertion order here via Object.values().
 */
export function buildTemplatePayload(message: OutboundMessage): WhatsAppSendPayload {
  validateOutboundMessage(message);

  const bodyComponent: WhatsAppTemplateComponent = {
    type: 'body',
    parameters: Object.values(message.parameters).map((value) => ({
      type: 'text',
      text: String(value),
    })),
  };

  return {
    messaging_product: 'whatsapp',
    to: message.customer_phone,
    type: 'template',
    template: {
      name: message.template_name,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? DEFAULT_LANGUAGE_CODE },
      components: [bodyComponent],
    },
  };
}
