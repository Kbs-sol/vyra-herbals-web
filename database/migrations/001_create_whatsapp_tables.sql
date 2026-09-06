-- 001_create_whatsapp_tables.sql
-- Audit log of every WhatsApp message sent/attempted. Append-mostly;
-- cleaned up by the daily retention cron (90 day default).

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  message_type TEXT NOT NULL,     -- 'ORDER_PLACED', 'SHIPMENT_CREATED', 'MANUAL', etc.
  message_id TEXT UNIQUE,         -- Meta's message ID (wamid_...)
  status TEXT NOT NULL,           -- 'sent', 'failed_retry', 'failed_permanent', 'delivered', 'read'
  provider TEXT DEFAULT 'whatsapp',

  template_name TEXT,
  parameters JSONB,

  attempts INTEGER DEFAULT 1,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order_id ON whatsapp_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
-- message_id already has a UNIQUE constraint above, which Postgres backs
-- with its own index automatically; no separate index needed (the spec's
-- duplicate idx_whatsapp_messages_message_id has been dropped).

-- RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin whatsapp read" ON whatsapp_messages
  FOR SELECT USING (
    auth.jwt() ->> 'role' = '2'  -- admin role, matches existing convention
  );

-- All writes go through the service-role key (server-side only), so no
-- INSERT/UPDATE policy is defined for the anon/authenticated roles.
