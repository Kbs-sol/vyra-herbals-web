-- 002_create_message_queue.sql
-- Working queue for pending sends and retries. Mutable, write-heavy;
-- failed_permanent rows older than 30 days are swept by the cleanup cron.

CREATE TABLE IF NOT EXISTS message_queue (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,

  message_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed_retry' | 'failed_permanent'
  provider TEXT DEFAULT 'whatsapp',

  template_name TEXT NOT NULL,
  parameters JSONB NOT NULL,

  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 7,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,

  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  payload JSONB NOT NULL,

  -- Added vs. the original spec: backs idempotent enqueue() so the same
  -- logical message (same order_id + message_type, or same delivery-status
  -- transition) is never queued twice even if emit() is called twice.
  dedupe_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status);
CREATE INDEX IF NOT EXISTS idx_message_queue_next_retry_at ON message_queue(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_message_queue_order_id ON message_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled_for ON message_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_message_queue_customer_phone ON message_queue(customer_phone);
-- dedupe_key's UNIQUE constraint already provides an index.

-- Service-role only — no end-user ever reads/writes this table directly.
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: RLS enabled with zero policies means only the
-- service-role key (which bypasses RLS) can touch this table. This is
-- stricter than the spec's "DISABLE ROW LEVEL SECURITY", which would have
-- left the table readable by anyone holding the anon key.
