-- =============================================================================
-- Migration: whatsapp_chat_messages (Original 1-1 Inbox Table)
-- =============================================================================
-- Stores both inbound (customer) and outbound (bot/admin) messages for the 
-- 1-to-1 WhatsApp Live Chat inbox in the Admin Dashboard.

CREATE TABLE IF NOT EXISTS public.whatsapp_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  body TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chat_messages_phone 
  ON public.whatsapp_chat_messages(phone_number, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chat_messages_created 
  ON public.whatsapp_chat_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow full access to service_role (used by server API routes)
DROP POLICY IF EXISTS "service_role_full_access_chat_messages" ON public.whatsapp_chat_messages;
CREATE POLICY "service_role_full_access_chat_messages" ON public.whatsapp_chat_messages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
