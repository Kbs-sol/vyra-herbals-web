-- ========================================
-- VYRA HERBALS - USER ADDRESSES SETUP
-- ========================================
-- Run this script in your Supabase SQL Editor
-- to create the user_addresses table
-- ========================================

-- 1. CREATE USER_ADDRESSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS user_addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  house_number TEXT,
  area TEXT NOT NULL,
  landmark TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT NOT NULL,
  address_type TEXT DEFAULT 'home', -- 'home', 'work', 'other'
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- 3. CREATE RLS POLICIES
-- ========================================
-- Policy for service role (full access for backend operations)
CREATE POLICY "Service role user_addresses access" ON user_addresses
  FOR ALL USING (true);

-- Users can manage their own addresses
-- CREATE POLICY "Users can view own addresses" ON user_addresses
--   FOR SELECT USING (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can insert own addresses" ON user_addresses
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
--   
-- CREATE POLICY "Users can update own addresses" ON user_addresses
--   FOR UPDATE USING (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can delete own addresses" ON user_addresses
--   FOR DELETE USING (auth.uid() = user_id);

-- 4. CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default);

-- Create a trigger function to ensure only one default address per user
CREATE OR REPLACE FUNCTION set_only_one_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Set all other addresses for this user to false
        UPDATE user_addresses
        SET is_default = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS ensure_single_default_address ON user_addresses;
CREATE TRIGGER ensure_single_default_address
BEFORE INSERT OR UPDATE ON user_addresses
FOR EACH ROW
EXECUTE FUNCTION set_only_one_default_address();
