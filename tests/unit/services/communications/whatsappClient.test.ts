import { WhatsAppClient } from '@/services/communications/providers/whatsapp/client';
import whatsappResponses from '../../../fixtures/whatsappResponses.json';
import type { OutboundMessage } from '@/types/communications';

const ORIGINAL_ENV = { ...process.env };

function mockFetchOnce(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const message: OutboundMessage = {
  order_id: 1001,
  customer_phone: '919876543210',
  message_type: 'ORDER_PLACED',
  provider: 'whatsapp',
  template_name: 'order_placed',
  parameters: { customer_name: 'Asha Rao' },
  dedupe_key: 'ORDER_PLACED:1001',
};

describe('WhatsAppClient', () => {
  beforeEach(() => {
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('returns success with a message_id on a 200 response', async () => {
    mockFetchOnce(200, whatsappResponses.success);
    const client = new WhatsAppClient();

    const result = await client.send(message);

    expect(result.success).toBe(true);
    expect(result.message_id).toBe(whatsappResponses.success.messages[0].id);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://graph.facebook.com/'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws a retryable ProviderError on a 429 rate-limit response', async () => {
    mockFetchOnce(429, whatsappResponses.rateLimited);
    const client = new WhatsAppClient();

    await expect(client.send(message)).rejects.toMatchObject({
      name: 'ProviderError',
      retryable: true,
      status: 429,
    });
  });

  it('throws a non-retryable ProviderError on a 400 invalid-template response', async () => {
    mockFetchOnce(400, whatsappResponses.invalidTemplate);
    const client = new WhatsAppClient();

    await expect(client.send(message)).rejects.toMatchObject({
      name: 'ProviderError',
      retryable: false,
      status: 400,
    });
  });

  it('skips sending and returns a clean failure when disabled', async () => {
    process.env.WHATSAPP_ENABLED = 'false';
    const client = new WhatsAppClient();

    const result = await client.send(message);

    expect(result.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('verifies a valid webhook signature', () => {
    process.env.WHATSAPP_APP_SECRET = 'test_app_secret';
    const client = new WhatsAppClient();
    const crypto = require('crypto');
    const payload = JSON.stringify({ hello: 'world' });
    const sig = 'sha256=' + crypto.createHmac('sha256', 'test_app_secret').update(payload).digest('hex');

    expect(client.verifyWebhook({ payload, signatureHeader: sig })).toBe(true);
  });

  it('rejects a tampered webhook signature', () => {
    process.env.WHATSAPP_APP_SECRET = 'test_app_secret';
    const client = new WhatsAppClient();
    expect(
      client.verifyWebhook({ payload: '{"hello":"world"}', signatureHeader: 'sha256=deadbeef' })
    ).toBe(false);
  });
});
