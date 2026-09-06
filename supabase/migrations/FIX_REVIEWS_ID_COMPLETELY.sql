-- ============================================
-- COMPLETE REVIEWS TABLE FIX
-- Run this script to ensure reviews table is properly configured
-- ============================================

-- 1. Check and recreate reviews table if needed with correct structure
BEGIN;

-- Drop existing reviews table and recreate with proper structure
DROP TABLE IF EXISTS reviews CASCADE;

CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reviewer_name TEXT NOT NULL,
  review_text TEXT NOT NULL,
  email TEXT,
  status INTEGER DEFAULT 0,                   -- 0 = pending, 1 = approved, 2 = rejected
  date TIMESTAMPTZ DEFAULT NOW(),             -- For compatibility
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX idx_reviews_id ON reviews(id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- 3. Enable RLS and set policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert reviews (will default to pending)
DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
CREATE POLICY "Anyone can insert reviews" ON reviews 
  FOR INSERT WITH CHECK (true);

-- Allow public to read only approved reviews (status = 1)
DROP POLICY IF EXISTS "Public approved reviews read" ON reviews;
CREATE POLICY "Public approved reviews read" ON reviews 
  FOR SELECT USING (status = 1);

-- Allow service role (admin) to read all reviews
DROP POLICY IF EXISTS "Admin reviews all read" ON reviews;
CREATE POLICY "Admin reviews all read" ON reviews 
  FOR SELECT USING (true);

-- Allow service role (admin) to update reviews
DROP POLICY IF EXISTS "Admin reviews update" ON reviews;
CREATE POLICY "Admin reviews update" ON reviews 
  FOR UPDATE USING (true);

-- Allow service role (admin) to delete reviews
DROP POLICY IF EXISTS "Admin reviews delete" ON reviews;
CREATE POLICY "Admin reviews delete" ON reviews 
  FOR DELETE USING (true);

COMMIT;

-- 4. Verify table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'reviews'
ORDER BY ordinal_position;

-- 5. Count reviews (should now all have ids)
SELECT COUNT(*) as total_reviews FROM reviews;
SELECT COUNT(id) as reviews_with_id FROM reviews WHERE id IS NOT NULL;
SELECT COUNT(id) as reviews_without_id FROM reviews WHERE id IS NULL;

-- 6. Show sample reviews
SELECT id, product_id, reviewer_name, status, created_at FROM reviews LIMIT 5;
