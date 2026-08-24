import type { OutboundMessage, ProviderSendResult } from '@/types/communications';

export interface ProviderConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface VerifyWebhookParams {
  payload: string; // raw request body, required for signature verification
  signatureHeader: string | null;
}

export interface WebhookStatusUpdate {
  message_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  error?: { code: number; message: string };
}
