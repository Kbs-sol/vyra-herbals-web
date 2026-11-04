export interface WhatsAppTemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

export type WhatsAppSendPayload =
  | {
      messaging_product: 'whatsapp';
      recipient_type?: 'individual';
      to: string;
      type: 'template';
      template: {
        name: string;
        language: { code: string };
        components: WhatsAppTemplateComponent[];
      };
    }
  | {
      messaging_product: 'whatsapp';
      recipient_type?: 'individual';
      to: string;
      type: 'text';
      text: { body: string; preview_url?: boolean };
    }
  | {
      messaging_product: 'whatsapp';
      recipient_type?: 'individual';
      to: string;
      type: 'interactive';
      interactive: {
        type: 'button' | 'list' | 'product_list' | 'catalog_message';
        header?: { type: 'text' | 'image'; text?: string; image?: { link: string } };
        body: { text: string };
        footer?: { text: string };
        action: any;
      };
    };

export interface WhatsAppApiSuccessResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string; message_status?: string }>;
}

export interface WhatsAppApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    field: string;
    value: {
      messaging_product: 'whatsapp';
      metadata: { display_phone_number: string; phone_number_id: string };
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
        errors?: Array<{ code: number; title: string; message: string }>;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: 'text' | 'interactive' | 'order' | 'button' | string;
        text?: { body: string };
        interactive?: {
          type: 'button_reply' | 'list_reply';
          button_reply?: { id: string; title: string };
          list_reply?: { id: string; title: string; description?: string };
        };
        order?: {
          catalog_id: string;
          product_items: Array<{
            product_retailer_id: string;
            quantity: string;
            item_price: string;
            currency: string;
          }>;
          text?: string;
        };
        context?: {
          from: string;
          id: string;
        };
      }>;
    };
  }>;
}

export interface WhatsAppWebhookBody {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}
