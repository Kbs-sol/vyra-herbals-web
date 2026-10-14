import type { EventType, MessageStatus, ProviderName, EventSource } from '@/types/communications';

export interface MessageLogInput {
  order_id: number | null;
  customer_phone: string;
  message_type: EventType;
  message_id?: string | null;
  status: MessageStatus;
  provider: ProviderName;
  template_name: string;
  parameters: Record<string, unknown>;
  attempts: number;
  last_error?: string | null;
  metadata?: unknown;
  sent_at?: Date | null;
}

export interface EventLogInput {
  order_id: number | null;
  event_type: EventType;
  event_source: EventSource;
  payload: Record<string, unknown>;
  status: 'received' | 'processing' | 'completed' | 'failed';
  error?: string | null;
}
