-- ========================================
-- WELCOME COUPON FEATURE - DATABASE SETUP
-- ========================================

-- 1. Site Settings Table (key-value store for admin-configurable settings)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Public can read, service role can write
CREATE POLICY "Public settings read" ON site_settings
  FOR SELECT USING (true);

-- 4. Seed default welcome coupon config
INSERT INTO site_settings (key, value) VALUES
  ('welcome_coupon', '{"enabled": true, "discount_percent": 10}')
ON CONFLICT (key) DO NOTHING;

-- 5. Add coupon tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS welcome_coupon_applied BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS welcome_coupon_discount NUMERIC DEFAULT 0;

-- ========================================
-- VERIFICATION
-- ========================================
SELECT * FROM site_settings WHERE key = 'welcome_coupon';
