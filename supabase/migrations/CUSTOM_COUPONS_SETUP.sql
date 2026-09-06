-- ========================================
-- CUSTOM COUPONS FEATURE - DATABASE SETUP
-- Admin-managed coupon codes for events, celebrations, etc.
-- ========================================

-- 1. Coupons table (admin-managed)
CREATE TABLE IF NOT EXISTS coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC,             -- cap for percent type (NULL = no cap)
  usage_limit INTEGER,                     -- total uses across all users (NULL = unlimited)
  per_user_limit INTEGER DEFAULT 1,        -- uses per user (NULL = unlimited)
  used_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,                   -- NULL = active immediately
  expires_at TIMESTAMPTZ,                  -- NULL = never expires
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_lower ON coupons(LOWER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);

-- 2. Coupon usage tracking (one row per redemption)
CREATE TABLE IF NOT EXISTS coupon_usages (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID,
  order_id BIGINT,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order ON coupon_usages(order_id);

-- 3. Add coupon tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC DEFAULT 0;

-- 4. Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: keep these tables locked down — service role bypasses RLS,
-- so all reads/writes go through our trusted server APIs.
-- (No public read policies — coupon list should never be exposed.)

-- ========================================
-- VERIFICATION
-- ========================================
SELECT 'coupons' AS tbl, COUNT(*) AS rows FROM coupons
UNION ALL
SELECT 'coupon_usages' AS tbl, COUNT(*) AS rows FROM coupon_usages;
