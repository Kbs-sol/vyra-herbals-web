/**
 * Integration test sketch: exercises emit() -> enqueue -> send against a
 * real (test) Supabase instance and a mocked WhatsApp API. Requires
 * SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY for a disposable test project, and
 * the 3 migrations applied. Skipped by default in CI unless
 * RUN_INTEGRATION_TESTS=true to avoid requiring live credentials for every
 * unit-test run.
 */
import { automationEngine } from '@/services/communications';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const describeIfIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIfIntegration('automation engine (integration)', () => {
  const testOrderId = 999000111;

  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        messaging_product: 'whatsapp',
        contacts: [{ input: '919876543210', wa_id: '919876543210' }],
        messages: [{ id: 'wamid.integration-test' }],
      }),
    }) as unknown as typeof fetch;
  });

  afterAll(async () => {
    const db = getSupabaseAdmin();
    await db.from('message_queue').delete().eq('order_id', testOrderId);
    await db.from('whatsapp_messages').delete().eq('order_id', testOrderId);
    await db.from('message_events').delete().eq('order_id', testOrderId);
  });

  it('creates a queue row, an audit row, and an event-log row for ORDER_PLACED', async () => {
    await automationEngine.emit(
      {
        type: 'ORDER_PLACED',
        order_id: testOrderId,
        user_id: 1,
        customer_phone: '9876543210',
        customer_name: 'Integration Test',
        total_amount: 100,
        payment_method: 'cod',
        items: [],
      },
      'api'
    );

    const db = getSupabaseAdmin();
    const { data: queueRows } = await db.from('message_queue').select('*').eq('order_id', testOrderId);
    const { data: messageRows } = await db.from('whatsapp_messages').select('*').eq('order_id', testOrderId);
    const { data: eventRows } = await db.from('message_events').select('*').eq('order_id', testOrderId);

    expect(queueRows).toHaveLength(1);
    expect(queueRows![0].status).toBe('sent');
    expect(messageRows).toHaveLength(1);
    expect(messageRows![0].message_id).toBe('wamid.integration-test');
    expect(eventRows).toHaveLength(1);
    expect(eventRows![0].status).toBe('completed');
  });

  it('does not create a duplicate queue row when the same event is emitted twice', async () => {
    const event = {
      type: 'ORDER_PLACED' as const,
      order_id: testOrderId,
      user_id: 1,
      customer_phone: '9876543210',
      customer_name: 'Integration Test',
      total_amount: 100,
      payment_method: 'cod' as const,
      items: [],
    };

    await automationEngine.emit(event, 'api');
    await automationEngine.emit(event, 'api');

    const db = getSupabaseAdmin();
    const { data } = await db.from('message_queue').select('*').eq('order_id', testOrderId);
    expect(data).toHaveLength(1); // idempotent via dedupe_key
  });
});
