-- ========================================
-- SETUP CATEGORIES FOR VYRA HERBALS
-- ========================================
-- Run this to ensure categories table has sample data

-- Ensure compatibility: add missing columns and populate them when running in older/alternate schemas
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;

-- If 'name' is empty but legacy 'category_name' exists, copy it across
UPDATE categories
SET name = category_name
WHERE (name IS NULL OR name = '');

-- Generate URL-friendly slugs from name when missing
UPDATE categories
SET slug = TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(name, '[^a-z0-9]+', '-', 'g')))
WHERE (slug IS NULL OR slug = '');

-- For duplicate slugs, append id to make them unique
WITH dups AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM categories
)
UPDATE categories
SET slug = categories.slug || '-' || categories.id
FROM dups
WHERE categories.id = dups.id AND dups.rn > 1;

-- Ensure a unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug_unique ON categories (slug);

-- Insert sample categories (will skip if already exists)
INSERT INTO categories (name, slug, description) VALUES
  ('Hair Oil', 'hair-oil', 'Nourishing hair oils for healthy hair'),
  ('Combs', 'combs', 'Wooden and neem combs'),
  ('Shampoo', 'shampoo', 'Natural herbal shampoos'),
  ('Scalp Massager', 'scalp-massager', 'Scalp massaging tools'),
  ('Hair Care Kits', 'hair-care-kits', 'Complete hair care solution sets'),
  ('Combos', 'combos', 'Value combo packs')
ON CONFLICT (slug) DO NOTHING;

-- Verify categories
SELECT * FROM categories ORDER BY name;
