-- Real customer chat proof (WhatsApp / Instagram screenshots) managed from Admin > Chat Reviews.
CREATE TABLE IF NOT EXISTS chat_reviews (
  id BIGSERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'whatsapp' CHECK (platform IN ('whatsapp', 'instagram')),
  caption TEXT,
  customer_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1, -- 1 = visible, 0 = hidden
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_reviews_status_order ON chat_reviews (status, sort_order, created_at DESC);

ALTER TABLE chat_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'chat_reviews' AND p.polname = 'Public chat reviews read'
  ) THEN
    CREATE POLICY "Public chat reviews read" ON chat_reviews FOR SELECT USING (status = 1);
  END IF;
END
$$;
-- Writes happen only through the admin API (service role bypasses RLS).
