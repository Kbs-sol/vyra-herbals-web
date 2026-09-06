-- =============================================
-- SECURITY AND OPTIMIZATION FOR USER HISTORY
-- =============================================
-- This script fixes RLS policies for orders and transactions
-- and adds necessary indexes for performance.
-- =============================================

-- 1. Optimization for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_email ON transactions(email);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- 2. Security: Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing if any to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;

-- Policy based on email (since transactions are matched by email)
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = email
  );

-- 3. Security: Fix Orders RLS
-- Existing policy "Anyone can read orders" is too open
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;

-- New secure policy for orders
CREATE POLICY "Users can read their own orders" ON orders
  FOR SELECT USING (
    -- Matches logged in user ID
    auth.uid()::text = user_id::text
    OR
    -- Matches email in shipping_data (guest/legacy orders)
    (auth.jwt() ->> 'email') = (shipping_data->>'email')
    OR
    -- Allow admins (if you use custom claims or check user metadata)
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );

-- 4. Security: Ensure user_addresses is fully protected
-- (Assuming ADD_USER_ADDRESSES.sql was run, but reinforcing here)
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON user_addresses;
CREATE POLICY "Users can manage their own addresses" ON user_addresses
  FOR ALL USING (auth.uid() = user_id);

RAISE NOTICE 'Security and optimization upgrades completed';
