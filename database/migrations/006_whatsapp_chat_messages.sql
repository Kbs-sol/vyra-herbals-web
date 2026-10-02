-- 006_whatsapp_chat_messages.sql
-- Table to store real-time inbound & outbound WhatsApp chat history for the Admin Chat Interface.

CREATE TABLE IF NOT EXISTS whatsapp_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'inbound' (from customer) or 'outbound' (from bot/admin)
  sender_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  body TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chat_messages_phone ON whatsapp_chat_messages(phone_number, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chat_messages_created ON whatsapp_chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE whatsapp_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to whatsapp_chat_messages" ON whatsapp_chat_messages
  FOR ALL USING (
    auth.jwt() ->> 'role' = '2'
  );
