import { buildTemplatePayload } from '@/services/communications/providers/whatsapp/messageBuilder';
import { ValidationError } from '@/services/communications/utils/errors';
import type { OutboundMessage } from '@/types/communications';

function baseMessage(overrides: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    order_id: 1001,
    customer_phone: '919876543210',
    message_type: 'ORDER_PLACED',
    provider: 'whatsapp',
    template_name: 'order_placed',
    parameters: { customer_name: 'Asha Rao', order_id: 1001, total_amount: '1499.00' },
    dedupe_key: 'ORDER_PLACED:1001',
    ...overrides,
  };
}

describe('buildTemplatePayload', () => {
  it('builds a well-formed Meta template payload', () => {
    const payload = buildTemplatePayload(baseMessage());

    expect(payload).toEqual({
      messaging_product: 'whatsapp',
      to: '919876543210',
      type: 'template',
      template: {
        name: 'order_placed',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Asha Rao' },
              { type: 'text', text: '1001' },
              { type: 'text', text: '1499.00' },
            ],
          },
        ],
      },
    });
  });

  it('preserves parameter insertion order positionally', () => {
    const payload = buildTemplatePayload(
      baseMessage({ parameters: { a: 'first', b: 'second', c: 'third' } })
    );
    expect(payload.template.components[0].parameters.map((p) => p.text)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('rejects an invalid phone number', () => {
    expect(() => buildTemplatePayload(baseMessage({ customer_phone: '123' }))).toThrow(
      ValidationError
    );
  });

  it('rejects a parameter containing a newline', () => {
    expect(() =>
      buildTemplatePayload(baseMessage({ parameters: { note: 'line1\nline2' } }))
    ).toThrow(ValidationError);
  });

  it('rejects a missing template_name', () => {
    expect(() => buildTemplatePayload(baseMessage({ template_name: '' }))).toThrow(ValidationError);
  });
});
