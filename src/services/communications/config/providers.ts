import type { ProviderConfig } from '../providers/types';

export function getWhatsAppConfig(): ProviderConfig {
  return {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  };
}

export const FEATURE_FLAGS = {
  ORDER_PLACED: () => process.env.WHATSAPP_SEND_ORDER_PLACED === 'true',
  PAYMENT_CONFIRMED: () => process.env.WHATSAPP_SEND_PAYMENT_CONFIRMED === 'true',
  SHIPMENT_CREATED: () => process.env.WHATSAPP_SEND_SHIPMENT_CREATED === 'true',
  DELIVERY_STATUS_UPDATED: () => process.env.WHATSAPP_SEND_DELIVERY_UPDATES === 'true',
  REFUND_INITIATED: () => process.env.WHATSAPP_SEND_REFUND_INITIATED === 'true',
} as const;
