-- ============================================================
-- VYRA HERBALS — PHASE 0 MIGRATIONS
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe: all changes are additive (IF NOT EXISTS everywhere)
-- ============================================================

-- ============================================================
-- M1: Anonymous Cart (device-fingerprint keyed, 90-day expiry)
-- ============================================================
CREATE TABLE IF NOT EXISTS anon_carts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    text        NOT NULL UNIQUE,
  items        jsonb       NOT NULL DEFAULT ''[]'',
  last_updated timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval ''90 days'',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anon_carts_device_id  ON anon_carts(device_id);
CREATE INDEX IF NOT EXISTS idx_anon_carts_expires_at ON anon_carts(expires_at);

ALTER TABLE anon_carts ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = ''anon_carts'' AND policyname = ''Service role manages anon carts'') THEN
    CREATE POLICY "Service role manages anon carts" ON anon_carts FOR ALL TO service_role USING (true);
  END IF;
END $do$;

-- ============================================================
-- M2: WhatsApp Cart Items
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_cart_items (
  id           bigserial   PRIMARY KEY,
  phone        text        NOT NULL,
  product_id   bigint      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity     int         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_add bigint      NOT NULL,
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wa_cart_items_phone ON whatsapp_cart_items(phone);

ALTER TABLE whatsapp_cart_items ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = ''whatsapp_cart_items'' AND policyname = ''Service role manages wa cart items'') THEN
    CREATE POLICY "Service role manages wa cart items" ON whatsapp_cart_items FOR ALL TO service_role USING (true);
  END IF;
END $do$;

-- ============================================================
-- M3: Historical Leads
-- ============================================================
CREATE TABLE IF NOT EXISTS historical_leads (
  id                     bigserial   PRIMARY KEY,
  full_name              text        NOT NULL,
  mobile_number          text        NOT NULL UNIQUE,
  total_orders           int         NOT NULL DEFAULT 1,
  last_order_date        date        NOT NULL,
  primary_category       text,
  segment                text        NOT NULL CHECK (segment IN (''vip_repeat'', ''win_back'')),
  duplicate_of_user_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  marketing_eligible     boolean     NOT NULL DEFAULT true,
  marketing_opt_out      boolean     NOT NULL DEFAULT false,
  last_marketing_sent_at timestamptz,
  imported_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_historical_leads_segment ON historical_leads(segment);
CREATE INDEX IF NOT EXISTS idx_historical_leads_phone   ON historical_leads(mobile_number);

ALTER TABLE historical_leads ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = ''historical_leads'' AND policyname = ''Admin reads historical leads'') THEN
    CREATE POLICY "Admin reads historical leads" ON historical_leads FOR SELECT TO public USING ((auth.jwt() ->> ''role'') = ''2'');
    CREATE POLICY "Service role manages historical leads" ON historical_leads FOR ALL TO service_role USING (true);
  END IF;
END $do$;

-- ============================================================
-- M4: Campaigns + Campaign Recipients
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id                bigserial   PRIMARY KEY,
  name              text        NOT NULL,
  template_name     text        NOT NULL,
  audience_segment  text        NOT NULL,
  audience_count    int         NOT NULL DEFAULT 0,
  sent_count        int         NOT NULL DEFAULT 0,
  failed_count      int         NOT NULL DEFAULT 0,
  opt_out_excluded  int         NOT NULL DEFAULT 0,
  freq_cap_excluded int         NOT NULL DEFAULT 0,
  estimated_cost    numeric(10,2),
  status            text        NOT NULL DEFAULT ''draft'' CHECK (status IN (''draft'',''sending'',''sent'',''failed'',''cancelled'')),
  created_by        text        NOT NULL DEFAULT ''admin'',
  idempotency_key   text        UNIQUE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  sent_at           timestamptz
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id                 bigserial   PRIMARY KEY,
  campaign_id        bigint      NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_phone     text        NOT NULL,
  customer_name      text,
  send_status        text        NOT NULL DEFAULT ''pending'' CHECK (send_status IN (''pending'',''sent'',''failed'',''opted_out'',''freq_capped'',''invalid'')),
  message_id         text,
  delivered_at       timestamptz,
  read_at            timestamptz,
  converted_order_id bigint      REFERENCES orders(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, customer_phone)
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_phone    ON campaign_recipients(customer_phone);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = ''campaigns'' AND policyname = ''Admin manages campaigns'') THEN
    CREATE POLICY "Admin manages campaigns" ON campaigns FOR ALL TO public USING ((auth.jwt() ->> ''role'') = ''2'');
    CREATE POLICY "Service role manages campaigns" ON campaigns FOR ALL TO service_role USING (true);
    CREATE POLICY "Admin manages campaign recipients" ON campaign_recipients FOR ALL TO public USING ((auth.jwt() ->> ''role'') = ''2'');
    CREATE POLICY "Service role manages campaign recipients" ON campaign_recipients FOR ALL TO service_role USING (true);
  END IF;
END $do$;

-- ============================================================
-- M5: Marketing columns on users
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in       boolean     NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_out      boolean     NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_marketing_sent_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS campaign_count_14d     int         NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS campaign_count_30d     int         NOT NULL DEFAULT 0;

-- ============================================================
-- M6: Order source column
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT ''website'' CHECK (source IN (''website'',''whatsapp'',''manual''));

-- ============================================================
-- M7: Notification Rules
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_rules (
  event       text    PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT true,
  template    text    NOT NULL,
  description text
);

INSERT INTO notification_rules (event, enabled, template, description) VALUES
  (''ORDER_PLACED'',            true, ''order_placed'',      ''Sent when order is placed (COD + prepaid)''),
  (''DELIVERY_STATUS_UPDATED'', true, ''delivered'',         ''Sent only on final delivered status''),
  (''FEEDBACK_REQUEST'',        true, ''feedback_request'',  ''Day 60 post-order feedback''),
  (''REORDER_REMINDER'',        true, ''reorder_reminder'',  ''Day 90 repurchase nudge''),
  (''WELCOME_PROMO'',           true, ''welcome_promo_3hr'', ''3-hour post-signup welcome promo''),
  (''ABANDONED_CART_DAY2'',     true, ''abandoned_cart'',    ''Day 2 abandoned cart nudge''),
  (''ABANDONED_CART_DAY9'',     true, ''abandoned_cart'',    ''Day 9 abandoned cart nudge'')
ON CONFLICT (event) DO NOTHING;

-- ============================================================
-- VERIFY
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = ''public''
  AND table_name IN (''anon_carts'',''whatsapp_cart_items'',''historical_leads'',''campaigns'',''campaign_recipients'',''notification_rules'')
ORDER BY table_name;
