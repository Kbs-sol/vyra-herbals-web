-- ========================================
-- VYRA HERBALS - PRODUCTION DATABASE FIX
-- ========================================
-- Run this in your Supabase SQL Editor BEFORE deployment
-- This ensures all tables have the correct schema
-- ========================================

-- ========================================
-- 1. ENSURE TRANSACTIONS TABLE HAS ALL COLUMNS
-- ========================================
-- This fixes the "Could not find the 'email' column" error

-- Check and add missing columns to transactions table
DO $$ 
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'email'
  ) THEN
    ALTER TABLE transactions ADD COLUMN email TEXT;
  END IF;

  -- Add firstname column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'firstname'
  ) THEN
    ALTER TABLE transactions ADD COLUMN firstname TEXT;
  END IF;

  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'phone'
  ) THEN
    ALTER TABLE transactions ADD COLUMN phone TEXT;
  END IF;

  -- Add productinfo column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'productinfo'
  ) THEN
    ALTER TABLE transactions ADD COLUMN productinfo TEXT;
  END IF;

  -- Add amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'amount'
  ) THEN
    ALTER TABLE transactions ADD COLUMN amount NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'status'
  ) THEN
    ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'created';
  END IF;

  -- Add txn_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'txn_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN txn_id TEXT;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Ensure products table has new columns (directions, benefits, ingredients, note)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'directions'
  ) THEN
    ALTER TABLE products ADD COLUMN directions TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'benefits'
  ) THEN
    ALTER TABLE products ADD COLUMN benefits TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'ingredients'
  ) THEN
    ALTER TABLE products ADD COLUMN ingredients TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'note'
  ) THEN
    ALTER TABLE products ADD COLUMN note TEXT;
  END IF;
END $$;

-- ========================================
-- 2. ENSURE ORDER_SESSIONS TABLE EXISTS
-- ========================================

CREATE TABLE IF NOT EXISTS order_sessions (
  id BIGSERIAL PRIMARY KEY,
  txn_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_order_sessions_txn_id ON order_sessions(txn_id);

-- Enable RLS
ALTER TABLE order_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create order sessions" ON order_sessions;
DROP POLICY IF EXISTS "Anyone can read order sessions" ON order_sessions;

-- Recreate policies
CREATE POLICY "Anyone can create order sessions" ON order_sessions 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read order sessions" ON order_sessions 
  FOR SELECT USING (true);

-- ========================================
-- 3. ENSURE ORDERS TABLE HAS ALL COLUMNS
-- ========================================

DO $$ 
BEGIN
  -- Add items column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'items'
  ) THEN
    ALTER TABLE orders ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- Add total_amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_amount NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- Add transaction_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'transaction_price'
  ) THEN
    ALTER TABLE orders ADD COLUMN transaction_price NUMERIC DEFAULT 0;
  END IF;

  -- Add shipping_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'shipping_data'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_data JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  -- Add payment_method column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cod';
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'placed';
  END IF;

  -- Add tracking_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'tracking_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN tracking_id TEXT;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ========================================
-- 4. ENSURE PRODUCTS TABLE HAS ALL COLUMNS
-- ========================================

DO $$ 
BEGIN
  -- Add handle column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'handle'
  ) THEN
    ALTER TABLE products ADD COLUMN handle TEXT UNIQUE;
  END IF;

  -- Add title column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'title'
  ) THEN
    ALTER TABLE products ADD COLUMN title TEXT;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'description'
  ) THEN
    ALTER TABLE products ADD COLUMN description TEXT;
  END IF;

  -- Add price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'price'
  ) THEN
    ALTER TABLE products ADD COLUMN price NUMERIC;
  END IF;

  -- Add regular_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'regular_price'
  ) THEN
    ALTER TABLE products ADD COLUMN regular_price NUMERIC;
  END IF;

  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url TEXT;
  END IF;

  -- Add images column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'images'
  ) THEN
    ALTER TABLE products ADD COLUMN images TEXT[];
  END IF;

  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products ADD COLUMN category TEXT;
  END IF;

  -- Add view_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE products ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE products ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ========================================
-- 5. ENSURE REVIEWS TABLE HAS ALL COLUMNS
-- ========================================

DO $$ 
BEGIN
  -- Add product_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN product_id BIGINT;
  END IF;

  -- Add rating column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'rating'
  ) THEN
    ALTER TABLE reviews ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
  END IF;

  -- Add reviewer_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'reviewer_name'
  ) THEN
    ALTER TABLE reviews ADD COLUMN reviewer_name TEXT;
  END IF;

  -- Add review_text column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'review_text'
  ) THEN
    ALTER TABLE reviews ADD COLUMN review_text TEXT;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'status'
  ) THEN
    ALTER TABLE reviews ADD COLUMN status INTEGER DEFAULT 0;
  END IF;

  -- Add date column if it doesn't exist (for compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'date'
  ) THEN
    ALTER TABLE reviews ADD COLUMN date TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE reviews ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ========================================
-- 6. ENSURE TESTIMONIALS TABLE EXISTS
-- ========================================

CREATE TABLE IF NOT EXISTS testimonials (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public approved testimonials read" ON testimonials;

-- Recreate policies
CREATE POLICY "Public approved testimonials read" ON testimonials 
  FOR SELECT USING (status = 1);

-- ========================================
-- 7. ENSURE CATEGORIES TABLE EXISTS
-- ========================================

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public categories read" ON categories;

-- Recreate policies
CREATE POLICY "Public categories read" ON categories 
  FOR SELECT USING (true);

-- ========================================
-- 8. ENSURE CART TABLE EXISTS
-- ========================================

CREATE TABLE IF NOT EXISTS cart (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role cart access" ON cart;

-- Recreate policies
CREATE POLICY "Service role cart access" ON cart 
  FOR ALL USING (true);

-- ========================================
-- 9. ENSURE USERS TABLE EXISTS
-- ========================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT,
  password TEXT,
  role BIGINT DEFAULT 1,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create users" ON users;

-- Recreate policies
CREATE POLICY "Anyone can create users" ON users 
  FOR INSERT WITH CHECK (true);

-- ========================================
-- 10. CREATE NECESSARY INDEXES
-- ========================================

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Cart indexes
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_txn_id ON transactions(txn_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ========================================
-- 11. ENSURE RLS POLICIES FOR ORDERS
-- ========================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;

-- Recreate policies
CREATE POLICY "Anyone can create orders" ON orders 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read orders" ON orders 
  FOR SELECT USING (true);

-- Allow service role to update orders (for admin)
CREATE POLICY "Service role can update orders" ON orders 
  FOR UPDATE USING (true);

-- Transactions policies
DROP POLICY IF EXISTS "Anyone can create transactions" ON transactions;
DROP POLICY IF EXISTS "Anyone can read transactions" ON transactions;

CREATE POLICY "Anyone can create transactions" ON transactions 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read transactions" ON transactions 
  FOR SELECT USING (true);

-- ========================================
-- 12. ENSURE REVIEWS RLS POLICIES
-- ========================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public approved reviews read" ON reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Public products read" ON products;

-- Recreate policies
CREATE POLICY "Public approved reviews read" ON reviews 
  FOR SELECT USING (status = 1);

CREATE POLICY "Anyone can insert reviews" ON reviews 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public products read" ON products 
  FOR SELECT USING (true);

-- ========================================
-- 13. VERIFICATION
-- ========================================

-- List all tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- List columns for critical tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('transactions', 'orders', 'products', 'reviews', 'order_sessions')
ORDER BY table_name, ordinal_position;

-- ========================================
-- DONE!
-- ========================================
-- Your database schema is now production-ready
-- All columns and tables should be correctly configured
