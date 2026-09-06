-- ========================================
-- VYRA HERBALS - SUPABASE DATABASE SCHEMA
-- ========================================
-- This schema documents the database structure for Vyra Herbals
-- Run MISSING_TABLES.sql for any missing tables/columns
-- ========================================

-- 1. USERS TABLE
-- Stores customer information
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  phone INT8,
  password TEXT,                              -- User password (consider hashing in production)
  role INT8 DEFAULT 1,                        -- 1 = customer, 2 = admin, etc.
  image TEXT,                                 -- Profile image URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
-- Main products catalog
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,                -- URL-friendly slug (e.g., 'hair-oil-100ml')
  title TEXT NOT NULL,                        -- Display name
  description TEXT,                           -- Full product description
  price NUMERIC NOT NULL,                     -- Current selling price
  regular_price NUMERIC,                      -- Original/MRP price (for discount calculation)
  image_url TEXT,                             -- Main product image filename
  images TEXT[],                              -- Additional gallery images (public URLs)
  category TEXT,                              -- Product category (hair-oil, combs, shampoo, etc.)
  view_count INTEGER DEFAULT 0,               -- Track product views
  directions TEXT,                            -- Product usage directions / how-to
  benefits TEXT,                              -- Key benefits / highlights
  ingredients TEXT,                           -- Ingredients list
  note TEXT,                                  -- Any short note or caution
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES TABLE (Optional - for structured category management)
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,                  -- Display name (e.g., 'Hair Oil')
  slug TEXT UNIQUE NOT NULL,                  -- URL slug (e.g., 'hair-oil')
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. REVIEWS TABLE
-- Customer reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reviewer_name TEXT NOT NULL,
  review_text TEXT NOT NULL,
  status INTEGER DEFAULT 0,                   -- 0 = pending approval, 1 = approved, 2 = rejected
  date TIMESTAMPTZ DEFAULT NOW(),             -- For compatibility with old schema
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TESTIMONIALS TABLE
-- Featured customer testimonials (separate from reviews)
CREATE TABLE IF NOT EXISTS testimonials (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status INTEGER DEFAULT 1,                   -- 0 = hidden, 1 = visible
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BLOGS TABLE
-- Blog posts for site content
CREATE TABLE IF NOT EXISTS blogs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  image_url TEXT,
  images TEXT[], -- array of image URLs
  status INTEGER DEFAULT 1, -- 0 = draft/hidden, 1 = published
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Blogs
CREATE INDEX IF NOT EXISTS idx_blogs_handle ON blogs(handle);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at DESC);

-- Add optional SEO and tags columns if missing
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS meta_description TEXT;
-- Related posts: allow admin to set related blog IDs (displayed on public blog page)
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS related_posts BIGINT[];

-- 7. CART TABLE
-- Shopping cart items for logged-in users
CREATE TABLE IF NOT EXISTS cart (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)                 -- One entry per product per user
);

-- 7. ORDERS TABLE
-- Order records
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  items JSONB NOT NULL,                       -- Array of {id, quantity, price, title}
  total_amount NUMERIC NOT NULL,              -- Total order value including COD charges
  transaction_price NUMERIC DEFAULT 0,        -- Amount paid via payment gateway (0 for COD)
  shipping_data JSONB NOT NULL,               -- Customer address and contact info
  payment_method TEXT NOT NULL,               -- 'cod' or 'online'
  status TEXT DEFAULT 'placed',               -- Order status: placed, confirmed, shipped, delivered, cancelled
  tracking_id TEXT,                           -- Shipping tracking number
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ORDER_SESSIONS TABLE
-- Temporary storage for payment flow
CREATE TABLE IF NOT EXISTS order_sessions (
  id BIGSERIAL PRIMARY KEY,
  txn_id TEXT,                                -- Transaction ID from payment gateway
  payload JSONB NOT NULL,                     -- Order data before payment confirmation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TRANSACTIONS TABLE
-- Payment gateway transaction records
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  amount NUMERIC NOT NULL,
  firstname TEXT,
  email TEXT,
  phone TEXT,
  productinfo TEXT,
  status TEXT DEFAULT 'created',              -- created, pending, success, failed
  txn_id TEXT,                                -- Payment gateway transaction ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
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

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Products: Public read access
CREATE POLICY "Public products read" ON products 
  FOR SELECT USING (true);

-- Reviews: Public can read approved reviews
CREATE POLICY "Public approved reviews read" ON reviews 
  FOR SELECT USING (status = 1);

-- Reviews: Anyone can insert (will be pending approval)
CREATE POLICY "Anyone can insert reviews" ON reviews 
  FOR INSERT WITH CHECK (true);

-- Testimonials: Public can read approved testimonials
CREATE POLICY "Public approved testimonials read" ON testimonials 
  FOR SELECT USING (status = 1);

-- Blogs: Public can read published blogs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'blogs' AND p.polname = 'Public published blogs read'
  ) THEN
    CREATE POLICY "Public published blogs read" ON blogs
      FOR SELECT USING (status = 1);
  END IF;
END
$$;

-- Categories: Public read access
CREATE POLICY "Public categories read" ON categories 
  FOR SELECT USING (true);

-- Cart: Users can only access their own cart (when auth is implemented)
-- For now, allow all operations since we're using service role key
CREATE POLICY "Service role cart access" ON cart 
  FOR ALL USING (true);

-- Orders: Public can insert (for COD orders without login)
CREATE POLICY "Anyone can create orders" ON orders 
  FOR INSERT WITH CHECK (true);

-- Orders: Public can read (will filter by order_id in API)
CREATE POLICY "Anyone can read orders" ON orders 
  FOR SELECT USING (true);

-- Users: Public can insert (for registration)
CREATE POLICY "Anyone can create users" ON users 
  FOR INSERT WITH CHECK (true);

-- ========================================
-- SAMPLE DATA (Optional - for testing)
-- ========================================

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
  ('Hair Oil', 'hair-oil', 'Nourishing hair oils for healthy hair'),
  ('Combs', 'combs', 'Wooden and neem combs'),
  ('Shampoo', 'shampoo', 'Natural herbal shampoos'),
  ('Scalp Massager', 'scalp-massager', 'Scalp massaging tools')
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these after creating tables to verify

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check products table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- ========================================
-- DONE!
-- ========================================
-- Your database is now ready for data import
-- Next step: Import your MySQL data
