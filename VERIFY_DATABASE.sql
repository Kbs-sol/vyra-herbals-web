-- ============================================
-- QUICK VERIFICATION QUERIES
-- ============================================
-- Run these queries in Supabase SQL Editor
-- to verify your database is production-ready
-- ============================================

-- 1. CHECK IF ALL REQUIRED TABLES EXIST
-- ============================================
SELECT 
  'Tables Check' as test,
  CASE 
    WHEN COUNT(*) >= 9 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END as result,
  COUNT(*) as tables_found,
  'Expected: 9+ tables' as expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- 2. CHECK TRANSACTIONS TABLE COLUMNS
-- ============================================
SELECT 
  'Transactions Columns' as test,
  CASE 
    WHEN COUNT(*) >= 9 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END as result,
  COUNT(*) as columns_found,
  'Expected: 9+ columns including email' as expected
FROM information_schema.columns 
WHERE table_name = 'transactions';

-- List transactions columns
SELECT 
  column_name, 
  data_type,
  CASE WHEN is_nullable = 'NO' THEN 'REQUIRED' ELSE 'OPTIONAL' END as required
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;


-- 3. CHECK ORDERS TABLE COLUMNS
-- ============================================
SELECT 
  'Orders Columns' as test,
  CASE 
    WHEN COUNT(*) >= 8 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END as result,
  COUNT(*) as columns_found,
  'Expected: 8+ columns' as expected
FROM information_schema.columns 
WHERE table_name = 'orders';

-- List orders columns
SELECT 
  column_name, 
  data_type,
  CASE WHEN is_nullable = 'NO' THEN 'REQUIRED' ELSE 'OPTIONAL' END as required
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;


-- 4. CHECK PRODUCTS TABLE COLUMNS
-- ============================================
SELECT 
  'Products Columns' as test,
  CASE 
    WHEN COUNT(*) >= 10 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END as result,
  COUNT(*) as columns_found,
  'Expected: 10+ columns' as expected
FROM information_schema.columns 
WHERE table_name = 'products';

-- List products columns
SELECT 
  column_name, 
  data_type,
  CASE WHEN is_nullable = 'NO' THEN 'REQUIRED' ELSE 'OPTIONAL' END as required
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;


-- 5. CHECK IF DATA EXISTS
-- ============================================
SELECT 
  'Products' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'WARNING ⚠️'
  END as status
FROM products
UNION ALL
SELECT 
  'Categories',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN 'PASS ✅' ELSE 'WARNING ⚠️' END
FROM categories
UNION ALL
SELECT 
  'Reviews',
  COUNT(*),
  CASE WHEN COUNT(*) >= 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END
FROM reviews
UNION ALL
SELECT 
  'Orders',
  COUNT(*),
  CASE WHEN COUNT(*) >= 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END
FROM orders
UNION ALL
SELECT 
  'Testimonials',
  COUNT(*),
  CASE WHEN COUNT(*) >= 0 THEN 'PASS ✅' ELSE 'INFO ℹ️' END
FROM testimonials;


-- 6. CHECK INDEXES
-- ============================================
SELECT 
  'Database Indexes' as test,
  CASE 
    WHEN COUNT(*) >= 8 THEN 'PASS ✅'
    ELSE 'WARNING ⚠️'
  END as result,
  COUNT(*) as indexes_found,
  'Expected: 8+ indexes for performance' as expected
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- List all indexes
SELECT 
  tablename as table_name,
  indexname as index_name,
  indexdef as definition
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;


-- 7. CHECK ROW LEVEL SECURITY (RLS)
-- ============================================
SELECT 
  tablename as table_name,
  CASE 
    WHEN rowsecurity THEN 'ENABLED ✅'
    ELSE 'DISABLED ⚠️'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('products', 'orders', 'reviews', 'cart', 'users', 'categories', 'transactions', 'order_sessions', 'testimonials')
ORDER BY tablename;


-- 8. CHECK RLS POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename as table_name,
  policyname as policy_name,
  CASE 
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'INSERT' THEN 'CREATE'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    WHEN cmd = '*' THEN 'ALL'
  END as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- 9. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;


-- 10. SAMPLE DATA CHECK
-- ============================================
-- Check if products have all required fields
SELECT 
  id,
  handle,
  title,
  price,
  category,
  CASE 
    WHEN handle IS NOT NULL 
      AND title IS NOT NULL 
      AND price IS NOT NULL 
      AND category IS NOT NULL 
    THEN 'VALID ✅'
    ELSE 'INVALID ❌'
  END as validation_status
FROM products
LIMIT 10;


-- 11. CHECK FOR NULL VALUES IN CRITICAL COLUMNS
-- ============================================
SELECT 
  'Products with NULL handle' as issue,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END as status
FROM products WHERE handle IS NULL
UNION ALL
SELECT 
  'Products with NULL price',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END
FROM products WHERE price IS NULL
UNION ALL
SELECT 
  'Orders with NULL items',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END
FROM orders WHERE items IS NULL
UNION ALL
SELECT 
  'Orders with NULL shipping_data',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END
FROM orders WHERE shipping_data IS NULL;


-- 12. CHECK RECENT ORDERS (IF ANY)
-- ============================================
SELECT 
  id as order_id,
  payment_method,
  status,
  total_amount,
  created_at,
  CASE 
    WHEN created_at > NOW() - INTERVAL '7 days' THEN 'RECENT'
    ELSE 'OLD'
  END as age
FROM orders
ORDER BY created_at DESC
LIMIT 5;


-- 13. STORAGE BUCKET CHECK (INFO ONLY)
-- ============================================
-- Note: This query won't work in SQL Editor
-- Check storage buckets in Supabase Dashboard > Storage
-- Expected: 'products' bucket exists and is public

SELECT 
  'Check Supabase Dashboard > Storage' as action,
  'Ensure "products" bucket exists and is public' as requirement;


-- 14. FINAL SUMMARY
-- ============================================
SELECT 
  '=== PRODUCTION READINESS SUMMARY ===' as summary;

-- Count critical tables
WITH table_counts AS (
  SELECT 
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_name = 'products') as has_products,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_name = 'orders') as has_orders,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_name = 'transactions') as has_transactions,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_name = 'order_sessions') as has_order_sessions,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'transactions' AND column_name = 'email') as has_email_column
)
SELECT 
  CASE 
    WHEN has_products = 1 
      AND has_orders = 1 
      AND has_transactions = 1 
      AND has_order_sessions = 1 
      AND has_email_column = 1 
    THEN '✅ DATABASE IS PRODUCTION READY! ✅'
    ELSE '❌ PLEASE RUN DATABASE_FIX_PRODUCTION.sql ❌'
  END as status,
  has_products as products_table,
  has_orders as orders_table,
  has_transactions as transactions_table,
  has_order_sessions as order_sessions_table,
  has_email_column as email_column_exists
FROM table_counts;


-- 15. QUICK DATA STATS
-- ============================================
SELECT 
  '=== DATA STATISTICS ===' as section;

SELECT 
  'Products' as metric,
  COUNT(*) as count
FROM products
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'Approved Reviews', COUNT(*) FROM reviews WHERE status = 1
UNION ALL
SELECT 'Pending Reviews', COUNT(*) FROM reviews WHERE status = 0
UNION ALL
SELECT 'Testimonials', COUNT(*) FROM testimonials;


-- ============================================
-- DONE! Review the results above
-- ============================================
-- 
-- ✅ All checks should show PASS or PASS ✅
-- ⚠️ Warnings are acceptable but review them
-- ❌ Any FAIL means you need to fix that issue
-- 
-- If "DATABASE IS PRODUCTION READY!" doesn't show,
-- run DATABASE_FIX_PRODUCTION.sql first!
-- ============================================
