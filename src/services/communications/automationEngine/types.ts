import type { CommunicationEvent, OutboundMessage, EventType } from '@/types/communications';

export interface EventHandler<E extends CommunicationEvent = CommunicationEvent> {
  eventType: EventType;
  /**
   * Builds the provider-agnostic outbound message for this event.
   * Returns null to signal "skip silently" (e.g. unusable phone number) —
   * the dispatcher logs this as a completed-but-skipped event, not a failure.
   */
  buildMessage(event: E): OutboundMessage | null;
}
