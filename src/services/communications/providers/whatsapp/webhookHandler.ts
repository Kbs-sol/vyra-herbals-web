import crypto from 'crypto';
import type { WhatsAppWebhookBody } from './types';
import type { WebhookStatusUpdate } from '../types';
import { logger } from '../../logging/logger';

/**
 * Meta signs every webhook POST body with HMAC-SHA256 using the app's
 * App Secret (Meta App Dashboard > Settings > Basic), sent in the
 * `X-Hub-Signature-256` header as `sha256=<hex>`.
 *
 * NOTE: this is a different secret from WHATSAPP_WEBHOOK_VERIFY_TOKEN,
 * which is only used for the one-time GET handshake when you register the
 * webhook URL. The original spec's env list only included the verify
 * token; WHATSAPP_APP_SECRET has been added below since it's required for
 * POST signature verification.
 */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    logger.error('whatsapp_webhook_missing_app_secret', {});
    return false;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const provided = signatureHeader.slice('sha256='.length);

  // Constant-time comparison to avoid timing attacks. Buffers must be equal
  // length or timingSafeEqual throws, so guard that first.
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(provided, 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Handles the one-time GET verification handshake Meta performs when you
 * register/change the webhook URL in the Meta App Dashboard.
 */
export function verifyWebhookHandshake(params: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
}): string | null {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (params.mode === 'subscribe' && params.token === expectedToken && params.challenge) {
    return params.challenge;
  }
  return null;
}

/**
 * Flattens Meta's nested entry/changes/statuses structure into a flat list
 * of status updates the rest of the app can work with.
 */
export function parseStatusUpdates(body: WhatsAppWebhookBody): WebhookStatusUpdate[] {
  const updates: WebhookStatusUpdate[] = [];

  if (body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
    return updates;
  }

  for (const entry of body.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      for (const status of change.value.statuses ?? []) {
        updates.push({
          message_id: status.id,
          status: status.status,
          timestamp: status.timestamp,
          error: status.errors?.[0]
            ? { code: status.errors[0].code, message: status.errors[0].message }
            : undefined,
        });
      }
    }
  }

  return updates;
}

/**
 * Flattens Meta's nested entry/changes/messages structure into a flat list
 * of incoming messages to be handled by the Bot Engine.
 */
export function parseIncomingMessages(body: WhatsAppWebhookBody): any[] {
  const messages: any[] = [];

  if (body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
    return messages;
  }

  for (const entry of body.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      for (const message of change.value.messages ?? []) {
        messages.push(message);
      }
    }
  }

  return messages;
}
