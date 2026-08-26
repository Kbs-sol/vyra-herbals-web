import type { OutboundMessage, ProviderSendResult } from '@/types/communications';
import type { VerifyWebhookParams, WebhookStatusUpdate } from './types';

/**
 * Abstract provider interface. Every channel (WhatsApp today; email/SMS/push
 * later) implements this so the automation engine and queue never need to
 * know which channel they're talking to.
 */
export abstract class CommunicationProvider {
  abstract readonly name: string;

  abstract isEnabled(): boolean;

  abstract send(message: OutboundMessage): Promise<ProviderSendResult>;

  /**
   * Verifies an inbound webhook's authenticity. Returns true/false rather
   * than throwing so callers can return a clean 401 without try/catch noise.
   */
  abstract verifyWebhook(params: VerifyWebhookParams): boolean;

  /**
   * Parses a verified webhook body into normalized status updates.
   */
  abstract parseWebhookEvent(body: unknown): WebhookStatusUpdate[];
}
