-- 003_create_message_events.sql
-- Audit trail of every domain event the automation engine has seen,
-- independent of whether it produced a message. Retention: 30 days.

CREATE TABLE IF NOT EXISTS message_events (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL,      -- 'ORDER_PLACED', 'PAYMENT_CONFIRMED', etc.
  event_source TEXT NOT NULL,    -- 'api' | 'webhook' | 'cron' | 'manual'

  payload JSONB NOT NULL,

  status TEXT NOT NULL,          -- 'received' | 'processing' | 'completed' | 'failed'
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_events_order_id ON message_events(order_id);
CREATE INDEX IF NOT EXISTS idx_message_events_event_type ON message_events(event_type);
CREATE INDEX IF NOT EXISTS idx_message_events_created_at ON message_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_events_status ON message_events(status);

ALTER TABLE message_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin events read" ON message_events
  FOR SELECT USING (
    auth.jwt() ->> 'role' = '2'
  );
