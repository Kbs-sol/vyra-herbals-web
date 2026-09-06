-- ========================================
-- SETUP PRODUCT INGREDIENTS TABLE
-- ========================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS product_ingredients (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status INTEGER DEFAULT 1, -- 1 = active, 0 = inactive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_id ON product_ingredients(product_id);

-- 3. Enable Row Level Security
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- 4. Create basic policies

-- Public read access for active (status = 1) ingredients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'product_ingredients' AND p.polname = 'Public product ingredients read'
  ) THEN
    CREATE POLICY "Public product ingredients read" ON product_ingredients
      FOR SELECT USING (status = 1);
  END IF;
END
$$;

-- Allow inserts/updates (for the admin panel matching the style of other tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'product_ingredients' AND p.polname = 'Anyone can modify product ingredients'
  ) THEN
    CREATE POLICY "Anyone can modify product ingredients" ON product_ingredients
      FOR ALL USING (true);
  END IF;
END
$$;

-- ========================================
-- DONE!
-- ========================================
