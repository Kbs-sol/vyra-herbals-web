-- MIGRATE_ADDRESS_TYPES.sql
-- Run this in your Supabase SQL Editor to update the existing user_addresses table

-- 1. Add address_type column if it doesn't exist
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS address_type TEXT DEFAULT 'home';

-- 2. Update existing addresses to have 'home' as default if they are null
UPDATE user_addresses SET address_type = 'home' WHERE address_type IS NULL;

-- 3. (Optional) Fix user_id type if it's not UUID (if needed)
-- ALTER TABLE user_addresses ALTER COLUMN user_id TYPE UUID USING (user_id::text::uuid);
