import { orderPlacedHandler } from '@/services/communications/automationEngine/handlers/orderPlaced';
import type { OrderPlacedEvent } from '@/types/communications';

const baseEvent: OrderPlacedEvent = {
  type: 'ORDER_PLACED',
  order_id: 1001,
  user_id: 55,
  customer_phone: '9876543210',
  customer_name: 'Asha Rao',
  total_amount: 1499,
  payment_method: 'cod',
  items: [],
  tracking_link: 'https://track.example.com/1001',
};

describe('orderPlacedHandler.buildMessage', () => {
  it('builds a valid OutboundMessage with normalized phone and ordered params', () => {
    const message = orderPlacedHandler.buildMessage(baseEvent);

    expect(message).not.toBeNull();
    expect(message!.customer_phone).toBe('919876543210');
    expect(message!.message_type).toBe('ORDER_PLACED');
    expect(Object.keys(message!.parameters)).toEqual([
      'customer_name',
      'order_id',
      'total_amount',
      'tracking_link',
    ]);
    expect(message!.dedupe_key).toBe('ORDER_PLACED:1001');
  });

  it('returns null for an invalid phone number instead of throwing', () => {
    const message = orderPlacedHandler.buildMessage({ ...baseEvent, customer_phone: 'bad' });
    expect(message).toBeNull();
  });

  it('defaults customer_name to "Customer" when blank', () => {
    const message = orderPlacedHandler.buildMessage({ ...baseEvent, customer_name: '' });
    expect(message!.parameters.customer_name).toBe('Customer');
  });
});
