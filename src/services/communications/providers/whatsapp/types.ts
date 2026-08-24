export interface WhatsAppTemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

export interface WhatsAppSendPayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components: WhatsAppTemplateComponent[];
  };
}

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
        type: string;
        text?: { body: string };
      }>;
    };
  }>;
}

export interface WhatsAppWebhookBody {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}
