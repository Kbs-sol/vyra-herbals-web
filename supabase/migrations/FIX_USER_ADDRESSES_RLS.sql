-- ========================================
-- FIX: user_addresses is currently exposed to every client
-- ========================================
-- How this happened (see git history):
--   1. ADD_USER_ADDRESSES.sql enabled RLS but created
--      "Service role user_addresses access" with USING (true) and no TO
--      clause -- that applies to EVERY role, including the public anon key
--      the browser uses. The real per-user policies in that same file were
--      left commented out.
--   2. FINAL_STORAGE_FIX.sql (committed the same day) then disabled RLS on
--      this table entirely as a temporary debugging step ("try saving an
--      address, if it works we can re-enable with proper policies") and it
--      was never re-enabled.
--   3. SECURITY_AND_OPTIMIZATION.sql adds the correct auth.uid() = user_id
--      policy, but it was committed BEFORE the two files above and never
--      dropped the wide-open policy, so it doesn't close the hole.
--
-- Net effect: anyone with the site's public anon key (i.e. anyone with
-- browser dev tools open on the site) can very likely read, insert, update,
-- and delete every customer's saved name, phone number, and home address.
--
-- Run this once in the Supabase SQL Editor for the vyra-herbals project to
-- close it. Safe to re-run.
-- ========================================

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role user_addresses access" ON user_addresses;
DROP POLICY IF EXISTS "Users can view own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON user_addresses;

CREATE POLICY "Users can manage their own addresses" ON user_addresses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify afterwards with:
--   SELECT polname, permissive, roles, qual, with_check
--   FROM pg_policies WHERE tablename = 'user_addresses';
-- You should see exactly ONE policy, restricted to auth.uid() = user_id.
