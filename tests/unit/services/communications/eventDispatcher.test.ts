import { emit } from '@/services/communications/automationEngine/eventDispatcher';
import { messageQueue } from '@/services/communications/queue/dbQueue';
import { sendQueuedMessage } from '@/services/communications/queue/messageSender';
import { logEvent, markEventProcessed } from '@/services/communications/logging/eventLogger';
import type { OrderPlacedEvent } from '@/types/communications';

jest.mock('@/services/communications/queue/dbQueue', () => ({
  messageQueue: { enqueue: jest.fn() },
}));
jest.mock('@/services/communications/queue/messageSender', () => ({
  sendQueuedMessage: jest.fn(),
}));
jest.mock('@/services/communications/logging/eventLogger', () => ({
  logEvent: jest.fn(),
  markEventProcessed: jest.fn(),
}));
jest.mock('@/services/communications/providers/whatsapp/client', () => ({
  whatsappClient: {},
}));

const baseEvent: OrderPlacedEvent = {
  type: 'ORDER_PLACED',
  order_id: 1001,
  user_id: 55,
  customer_phone: '9876543210',
  customer_name: 'Asha Rao',
  total_amount: 1499,
  payment_method: 'cod',
  items: [],
};

describe('eventDispatcher.emit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHATSAPP_SEND_ORDER_PLACED = 'true';
    (logEvent as jest.Mock).mockResolvedValue(42);
    (messageQueue.enqueue as jest.Mock).mockResolvedValue({ id: 7, order_id: 1001 });
    (sendQueuedMessage as jest.Mock).mockResolvedValue('sent');
  });

  it('logs the event, enqueues a message, sends it, and marks the event completed', async () => {
    await emit(baseEvent, 'api');

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: 1001, event_type: 'ORDER_PLACED', status: 'received' })
    );
    expect(messageQueue.enqueue).toHaveBeenCalled();
    expect(sendQueuedMessage).toHaveBeenCalled();
    expect(markEventProcessed).toHaveBeenCalledWith(42, 'completed');
  });

  it('skips enqueueing and marks completed when the feature flag is disabled', async () => {
    process.env.WHATSAPP_SEND_ORDER_PLACED = 'false';

    await emit(baseEvent, 'api');

    expect(messageQueue.enqueue).not.toHaveBeenCalled();
    expect(markEventProcessed).toHaveBeenCalledWith(42, 'completed');
  });

  it('skips enqueueing when the handler returns no message (invalid phone)', async () => {
    await emit({ ...baseEvent, customer_phone: 'not-a-phone' }, 'api');

    expect(messageQueue.enqueue).not.toHaveBeenCalled();
    expect(markEventProcessed).toHaveBeenCalledWith(
      42,
      'completed',
      expect.stringContaining('Skipped')
    );
  });

  it('marks the event failed if enqueue throws, without re-throwing', async () => {
    (messageQueue.enqueue as jest.Mock).mockRejectedValue(new Error('db down'));

    await expect(emit(baseEvent, 'api')).resolves.toBeUndefined();
    expect(markEventProcessed).toHaveBeenCalledWith(42, 'failed', 'db down');
  });

  it('does not fail the event if the immediate send throws (cron will retry)', async () => {
    (sendQueuedMessage as jest.Mock).mockRejectedValue(new Error('network blip'));

    await emit(baseEvent, 'api');

    expect(markEventProcessed).toHaveBeenCalledWith(42, 'completed');
  });
});
