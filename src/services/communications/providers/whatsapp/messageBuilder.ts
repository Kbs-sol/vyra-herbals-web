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

  const components: WhatsAppTemplateComponent[] = [
    {
      type: 'body',
      parameters: (Array.isArray(message.parameters) ? message.parameters : Object.values(message.parameters)).map((value) => ({
        type: 'text',
        text: String(value),
      })),
    }
  ];

  // if (message.header_image_url) {
  //   components.push({
  //     type: 'header',
  //     parameters: [
  //       {
  //         type: 'image',
  //         image: { link: message.header_image_url },
  //       },
  //     ],
  //   });
  // }

  if (message.button_parameters && message.button_parameters.length > 0) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: message.button_parameters.map((val) => ({
        type: 'text',
        text: String(val),
      })),
    });
  }

  return {
    messaging_product: 'whatsapp',
    to: message.customer_phone,
    type: 'template',
    template: {
      name: message.template_name,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? DEFAULT_LANGUAGE_CODE },
      components,
    },
  };
}
