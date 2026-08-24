import type { EventHandler } from '../types';
import type { CommunicationEvent, EventType } from '@/types/communications';

export abstract class BaseEventHandler<E extends CommunicationEvent> implements EventHandler<E> {
  abstract readonly eventType: EventType;
  abstract buildMessage(event: E): import('@/types/communications').OutboundMessage | null;
}
