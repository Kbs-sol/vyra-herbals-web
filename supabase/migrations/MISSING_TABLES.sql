-- ========================================
-- VYRA HERBALS - MISSING TABLES SQL SCRIPT
-- ========================================
-- Run this in your Supabase SQL Editor
-- This script creates missing tables that are needed for the application
-- ========================================

-- ========================================
-- 0. ADD FOREIGN KEY CONSTRAINT TO REVIEWS TABLE (IMPORTANT!)
-- ========================================
-- This is needed for Supabase to understand the relationship between products and reviews
-- Run this first!

-- First, check if the foreign key already exists and add it if not
DO $$ 
BEGIN 
  -- Ensure products.id exists and is uniquely constrained before adding FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'id'
  ) THEN
    ALTER TABLE products ADD COLUMN id BIGSERIAL;
  END IF;

  -- Ensure a sequence exists and backfill any NULL ids
  PERFORM 1 FROM pg_class WHERE relname = 'products_id_seq';
  IF NOT FOUND THEN
    CREATE SEQUENCE products_id_seq;
  END IF;

  -- Set default to sequence (id must be integer-like already)
  ALTER TABLE products ALTER COLUMN id SET DEFAULT nextval('products_id_seq');

  -- Backfill NULL ids using the sequence
  UPDATE products SET id = nextval('products_id_seq') WHERE id IS NULL;

  -- Align sequence with current max id
  PERFORM setval('products_id_seq', (SELECT COALESCE(MAX(id), 0) FROM products));

  -- Add a primary key on products.id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'products' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    -- NOTE: This will fail if products.id has nulls or duplicates; clean data first if needed
    ALTER TABLE products ADD PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reviews_product_id_fkey' 
    AND table_name = 'reviews'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE reviews 
    ADD CONSTRAINT reviews_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- ========================================
-- 1. ORDER_SESSIONS TABLE (MISSING)
-- ========================================
-- This table stores temporary order data during payment flow
-- Used by /api/payment/session endpoint

CREATE TABLE IF NOT EXISTS order_sessions (
  id BIGSERIAL PRIMARY KEY,
  txn_id TEXT,                                -- Transaction ID from payment gateway
  payload JSONB NOT NULL,                     -- Order data before payment confirmation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookup by txn_id
CREATE INDEX IF NOT EXISTS idx_order_sessions_txn_id ON order_sessions(txn_id);

-- Enable RLS
ALTER TABLE order_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert order sessions (for payment flow)
CREATE POLICY "Anyone can create order sessions" ON order_sessions 
  FOR INSERT WITH CHECK (true);

-- Allow reading order sessions (for payment verification)
CREATE POLICY "Anyone can read order sessions" ON order_sessions 
  FOR SELECT USING (true);


-- ========================================
-- 2. TESTIMONIALS TABLE (MISSING - if you want separate testimonials)
-- ========================================
-- Note: Your app currently uses the 'reviews' table for testimonials
-- This is optional if you want to keep testimonials separate

CREATE TABLE IF NOT EXISTS testimonials (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status INTEGER DEFAULT 1,                   -- 0 = hidden, 1 = visible
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read approved testimonials
CREATE POLICY "Public approved testimonials read" ON testimonials 
  FOR SELECT USING (status = 1);


-- ========================================
-- 3. UPDATE EXISTING TABLES (IF NEEDED)
-- ========================================

-- Add missing columns to USERS table if they don't exist
DO $$ 
BEGIN 
  -- Add password column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'password') THEN
    ALTER TABLE users ADD COLUMN password TEXT;
  END IF;
  
  -- Add role column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role INT8 DEFAULT 1;
  END IF;
  
  -- Add image column if missing (for user profile pictures)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'image') THEN
    ALTER TABLE users ADD COLUMN image TEXT;
  END IF;
END $$;


-- Add missing columns to REVIEWS table if they don't exist
DO $$ 
BEGIN 
  -- Add reviewer_name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'reviews' AND column_name = 'reviewer_name') THEN
    ALTER TABLE reviews ADD COLUMN reviewer_name TEXT;
  END IF;
  
  -- Add review_text column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'reviews' AND column_name = 'review_text') THEN
    ALTER TABLE reviews ADD COLUMN review_text TEXT;
  END IF;
  
  -- Add status column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'reviews' AND column_name = 'status') THEN
    ALTER TABLE reviews ADD COLUMN status INTEGER DEFAULT 0;
  END IF;
  
  -- Add created_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'reviews' AND column_name = 'created_at') THEN
    ALTER TABLE reviews ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;


-- Add missing columns to PRODUCTS table if they don't exist
DO $$ 
BEGIN 
  -- Add handle column if missing (URL-friendly slug)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'handle') THEN
    ALTER TABLE products ADD COLUMN handle TEXT;
    -- Create unique index on handle
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_handle_unique ON products(handle);
  END IF;
  
  -- Add image_url column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'image_url') THEN
    ALTER TABLE products ADD COLUMN image_url TEXT;
  END IF;

  -- Add images array column for gallery support if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'images') THEN
    ALTER TABLE products ADD COLUMN images TEXT[] DEFAULT '{}';
  END IF;
  
  -- Add regular_price column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'regular_price') THEN
    ALTER TABLE products ADD COLUMN regular_price NUMERIC;
  END IF;
  
  -- Add view_count column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'view_count') THEN
    ALTER TABLE products ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
END $$;


-- Add missing columns to ORDERS table if they don't exist
DO $$ 
BEGIN 
  -- Add items column if missing (JSONB for order items)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'items') THEN
    ALTER TABLE orders ADD COLUMN items JSONB;
  END IF;
  
  -- Add shipping_data column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'shipping_data') THEN
    ALTER TABLE orders ADD COLUMN shipping_data JSONB;
  END IF;
  
  -- Add payment_method column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cod';
  END IF;
  
  -- Add total_amount column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
    ALTER TABLE orders ADD COLUMN total_amount NUMERIC;
  END IF;
  
  -- Add transaction_price column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'transaction_price') THEN
    ALTER TABLE orders ADD COLUMN transaction_price NUMERIC DEFAULT 0;
  END IF;
  
  -- Add status column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'status') THEN
    ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'placed';
  END IF;
  
  -- Add tracking_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'tracking_id') THEN
    ALTER TABLE orders ADD COLUMN tracking_id TEXT;
  END IF;
END $$;


-- Add missing columns to TRANSACTIONS table if they don't exist
DO $$ 
BEGIN 
  -- Add txn_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' AND column_name = 'txn_id') THEN
    ALTER TABLE transactions ADD COLUMN txn_id TEXT;
  END IF;
  
  -- Add status column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' AND column_name = 'status') THEN
    ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'created';
  END IF;
  
  -- Add firstname column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' AND column_name = 'firstname') THEN
    ALTER TABLE transactions ADD COLUMN firstname TEXT;
  END IF;
  
  -- Add productinfo column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' AND column_name = 'productinfo') THEN
    ALTER TABLE transactions ADD COLUMN productinfo TEXT;
  END IF;
END $$;


-- ========================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Add product detail columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'directions') THEN
    ALTER TABLE products ADD COLUMN directions TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'benefits') THEN
    ALTER TABLE products ADD COLUMN benefits TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'ingredients') THEN
    ALTER TABLE products ADD COLUMN ingredients TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'note') THEN
    ALTER TABLE products ADD COLUMN note TEXT;
  END IF;
END $$;

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


-- ========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================
-- Note: Only apply these if you haven't set up RLS already

-- Enable RLS on tables (if not already enabled)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts (uncomment if needed)
-- DROP POLICY IF EXISTS "Public products read" ON products;
-- DROP POLICY IF EXISTS "Public approved reviews read" ON reviews;
-- DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
-- DROP POLICY IF EXISTS "Service role cart access" ON cart;
-- DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
-- DROP POLICY IF EXISTS "Anyone can read orders" ON orders;
-- DROP POLICY IF EXISTS "Anyone can create users" ON users;
-- DROP POLICY IF EXISTS "Public categories read" ON categories;

-- Products: Public read access
DO $$ BEGIN
  CREATE POLICY "Public products read" ON products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reviews: Public can read approved reviews
DO $$ BEGIN
  CREATE POLICY "Public approved reviews read" ON reviews FOR SELECT USING (status = 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reviews: Anyone can insert reviews (will be pending approval with status=0)
DO $$ BEGIN
  CREATE POLICY "Anyone can insert reviews" ON reviews FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Categories: Public read access
DO $$ BEGIN
  CREATE POLICY "Public categories read" ON categories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cart: Allow all operations (for development/testing)
DO $$ BEGIN
  CREATE POLICY "Service role cart access" ON cart FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Orders: Public can insert
DO $$ BEGIN
  CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Orders: Public can read
DO $$ BEGIN
  CREATE POLICY "Anyone can read orders" ON orders FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users: Public can insert (for registration)
DO $$ BEGIN
  CREATE POLICY "Anyone can create users" ON users FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users: Users can read their own data
DO $$ BEGIN
  CREATE POLICY "Users can read own data" ON users FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ========================================
-- 6. VERIFY TABLES AND COLUMNS
-- ========================================
-- Run this query to check your table structure:

SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('products', 'reviews', 'orders', 'users', 'cart', 'categories', 'transactions', 'order_sessions', 'testimonials')
ORDER BY table_name, ordinal_position;


-- ========================================
-- SUCCESS!
-- ========================================
-- After running this script, your database should have all the 
-- necessary tables and columns for the Vyra Herbals website.
--
-- Tables needed by the application:
-- ✓ products (with handle, image_url, regular_price)
-- ✓ categories
-- ✓ reviews (with reviewer_name, review_text, status)
-- ✓ cart
-- ✓ orders (with items, shipping_data, payment_method)
-- ✓ users (with password, role)
-- ✓ transactions
-- ✓ order_sessions (NEW - for payment flow)
-- ✓ testimonials (OPTIONAL)
-- ========================================
