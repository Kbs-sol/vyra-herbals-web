-- FINAL_STORAGE_FIX.sql
-- Run this to fix the hanging and storage issues

-- 1. Ensure address_type column exists
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS address_type TEXT DEFAULT 'home';

-- 2. Improve the trigger function (Set SECURITY DEFINER to avoid RLS deadlocks during update)
CREATE OR REPLACE FUNCTION set_only_one_default_address()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if the new address is set as default
    IF NEW.is_default = true THEN
        -- Set all other addresses for this user to false
        -- Use pg_trigger_depth() to prevent infinite recursion
        IF pg_trigger_depth() < 2 THEN
            UPDATE user_addresses
            SET is_default = false
            WHERE user_id = NEW.user_id AND id != NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. DISABLE RLS TEMPORARILY (To verify if it's a policy issue)
-- After running this, try saving an address. If it works, we can re-enable with proper policies.
ALTER TABLE user_addresses DISABLE ROW LEVEL SECURITY;

-- 4. Check if users table exists and the user is in it (optional but recommended)
-- If you get a foreign key error, it means the user e948d454-e4ef-419d-990c-e6583602ee61 is not in your public.users table.
