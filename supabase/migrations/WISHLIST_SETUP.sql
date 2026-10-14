-- ========================================
-- VYRA HERBALS - WISHLIST TABLE SETUP
-- ========================================
-- Run this script in your Supabase SQL Editor
-- to create the wishlist table and related policies
-- ========================================

-- 1. CREATE WISHLIST TABLE
-- ========================================
-- This table stores products that users have saved to their wishlist
-- NOTE: user_id uses UUID type to match your users table

CREATE TABLE IF NOT EXISTS wishlist (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 2. ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- 3. CREATE RLS POLICIES
-- ========================================
-- Policy for service role (full access for backend operations)
CREATE POLICY "Service role wishlist access" ON wishlist
  FOR ALL USING (true);

-- Optional: Policy for users to manage their own wishlist
-- Uncomment if using Supabase Auth:
-- CREATE POLICY "Users can manage own wishlist" ON wishlist
--   FOR ALL USING (auth.uid() = user_id);

-- 4. CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_created_at ON wishlist(created_at DESC);

-- ========================================
-- VERIFICATION
-- ========================================
-- Check RLS policies
SELECT policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'wishlist';

-- ========================================
-- DONE!
-- ========================================
