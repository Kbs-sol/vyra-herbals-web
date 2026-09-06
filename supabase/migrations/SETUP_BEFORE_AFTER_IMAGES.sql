-- ========================================
-- SETUP BEFORE & AFTER IMAGES TABLE
-- ========================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS before_after_images (
  id BIGSERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  status INTEGER DEFAULT 1, -- 1 = active, 0 = inactive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE before_after_images ENABLE ROW LEVEL SECURITY;

-- 3. Create basic policies

-- Public read access for active (status = 1) images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'before_after_images' AND p.polname = 'Public before after images read'
  ) THEN
    CREATE POLICY "Public before after images read" ON before_after_images
      FOR SELECT USING (status = 1);
  END IF;
END
$$;

-- Allow inserts (for the admin panel matching the style of other tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'before_after_images' AND p.polname = 'Anyone can insert before after images'
  ) THEN
    CREATE POLICY "Anyone can insert before after images" ON before_after_images
      FOR ALL USING (true);
  END IF;
END
$$;

-- ========================================
-- DONE!
-- ========================================
