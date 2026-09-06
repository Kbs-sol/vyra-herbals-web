import { CommunicationProvider } from '../base';
import type { VerifyWebhookParams, WebhookStatusUpdate } from '../types';
import type { OutboundMessage, ProviderSendResult } from '@/types/communications';
import type {
  WhatsAppSendPayload,
  WhatsAppApiSuccessResponse,
  WhatsAppApiErrorResponse,
  WhatsAppWebhookBody,
} from './types';
import { ProviderError } from '../../utils/errors';
import { buildTemplatePayload } from './messageBuilder';
import { verifyMetaSignature, parseStatusUpdates, parseIncomingMessages } from './webhookHandler';
import { logger } from '../../logging/logger';

const GRAPH_API_VERSION = 'v19.0';

/**
 * NOTE: the original spec's data-flow diagram referenced
 * `graph.instagram.com` — that's incorrect for WhatsApp Cloud API.
 * The correct Meta Graph API host is `graph.facebook.com`, used below.
 */
const GRAPH_API_BASE = 'https://graph.facebook.com';

export class WhatsAppClient extends CommunicationProvider {
  readonly name = 'whatsapp';

  private get phoneNumberId(): string {
    return process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
  }

  private get accessToken(): string {
    return process.env.WHATSAPP_ACCESS_TOKEN ?? '';
  }

  isEnabled(): boolean {
    return (
      process.env.WHATSAPP_ENABLED === 'true' &&
      !!this.phoneNumberId &&
      !!this.accessToken
    );
  }

  async send(message: OutboundMessage): Promise<ProviderSendResult> {
    if (!this.isEnabled()) {
      logger.warn('whatsapp_send_skipped_disabled', { order_id: message.order_id });
      return { success: false, error: { message: 'WhatsApp provider is disabled' } };
    }

    const payload: WhatsAppSendPayload = buildTemplatePayload(message);
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${this.phoneNumberId}/messages`;

    const start = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      // fetch() throws on network-level failures (DNS, timeout, refused, etc.)
      const err = networkErr as Error;
      logger.error('whatsapp_send_network_error', {
        order_id: message.order_id,
        error: err.message,
        duration_ms: Date.now() - start,
      });
      throw new ProviderError(err.message ?? 'Network error calling WhatsApp API');
    }

    const json = (await response.json().catch(() => ({}))) as
      | WhatsAppApiSuccessResponse
      | WhatsAppApiErrorResponse;

    if (!response.ok || 'error' in json) {
      const errBody = json as WhatsAppApiErrorResponse;
      const message_ = errBody.error?.message ?? `WhatsApp API error (HTTP ${response.status})`;
      logger.error('whatsapp_send_failed', {
        order_id: message.order_id,
        status: response.status,
        error: message_,
        duration_ms: Date.now() - start,
      });
      throw new ProviderError(message_, response.status, errBody.error?.code);
    }

    const success = json as WhatsAppApiSuccessResponse;
    const messageId = success.messages?.[0]?.id;

    logger.info('whatsapp_send_succeeded', {
      order_id: message.order_id,
      message_id: messageId,
      duration_ms: Date.now() - start,
    });

    return { success: true, message_id: messageId, raw: success };
  }

  /**
   * Sends a raw payload directly to Meta (useful for conversational bot replies
   * that bypass the standard outbound Template Message engine).
   */
  async sendRaw(payload: WhatsAppSendPayload): Promise<ProviderSendResult> {
    if (!this.isEnabled()) {
      return { success: false, error: { message: 'WhatsApp provider is disabled' } };
    }
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${this.phoneNumberId}/messages`;
    
    const start = Date.now();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson && responseBody ? JSON.parse(responseBody) : null;

      if (!response.ok) {
        const errorData = data as WhatsAppApiErrorResponse;
        logger.error('whatsapp_send_raw_failed', {
          status: response.status,
          error: errorData?.error,
        });
        return {
          success: false,
          error: {
            message: errorData?.error?.message ?? `HTTP ${response.status}: ${responseBody}`,
            code: errorData?.error?.code?.toString(),
          },
        };
      }

      const successData = data as WhatsAppApiSuccessResponse;
      return {
        success: true,
        message_id: successData.messages?.[0]?.id,
        raw: successData,
      };
    } catch (error: any) {
      logger.error('whatsapp_send_raw_exception', { error: error.message });
      return {
        success: false,
        error: { message: error.message || 'Unknown network error' },
      };
    }
  }

  verifyWebhook(params: VerifyWebhookParams): boolean {
    return verifyMetaSignature(params.payload, params.signatureHeader);
  }

  parseWebhookEvent(body: unknown): WebhookStatusUpdate[] {
    return parseStatusUpdates(body as WhatsAppWebhookBody);
  }

  parseIncomingMessages(body: unknown): any[] {
    return parseIncomingMessages(body as WhatsAppWebhookBody);
  }
}

// Singleton instance — the rest of the app should import this, not `new WhatsAppClient()`.
export const whatsappClient = new WhatsAppClient();
