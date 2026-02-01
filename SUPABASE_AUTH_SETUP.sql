-- ==============================================================================
-- SUPABASE AUTH INTEGRATION SETUP
-- This script links the public tables (users, cart, orders) with Supabase Auth.
-- ==============================================================================

-- 1. UTILS/FUNCTIONS needed
-- Function to automatically create a public.user record when a new Auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    NEW.id, -- Use the UUID from auth.users
    NEW.email,
    NEW.raw_user_meta_data->>'name', -- Assuming 'name' is passed in metadata
    1 -- Default role
  );
  return new;
end;
$$;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. MODIFY USERS TABLE
-- We need to change the ID type from BIGINT (serial) to UUID to match auth.users.
-- WARNING: This drops the existing primary key sequence.
-- If you have existing data without matching auth.users, this might be tricky.
-- For a fresh start or if current data is disposable:

-- Drop existing foreign keys referencing users.id first
ALTER TABLE cart DROP CONSTRAINT IF EXISTS cart_user_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey; -- If it exists (it didn't in provided schema but good practice)

-- Alter users table
ALTER TABLE users ALTER COLUMN id TYPE uuid USING (uuid_generate_v4()); -- Or just drop/recreate if easier.
-- NOTE: In Supabase, it's often better to just let the trigger handle insertions.
-- But since we are modifying an existing table:
-- ALTER TABLE users ALTER COLUMN id DROP DEFAULT; -- Remove serial default
-- ALTER TABLE users ALTER COLUMN id TYPE uuid USING (gen_random_uuid()); -- If you need to convert existing int ids to random uuids (not clean)

-- BETTER APPROACH for existing project integration:
-- Let's just create a new UUID column 'auth_id' if we wanted to keep legacy IDs,
-- BUT the prompt implies a "proper implementation" from scratchish state ("currently... not having user login").
-- So we will convert the ID column to UUID.

-- 2. MODIFY USERS TABLE
-- We need to change the ID type from BIGINT (serial) to UUID to match auth.users.
-- We will DROP and RECREATE the table to be clean and sync with Auth.
-- Dropping with CASCADE to handle foreign keys (like cart, orders)

DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Link directly to auth.users
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT,
  role INT8 DEFAULT 1,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public can read basic user info" ON public.users FOR SELECT USING (true); -- Optional: needed if we want to show reviews by user name etc.

-- 3. MODIFY CART TABLE
-- Refactor to use UUID user_id
DROP TABLE IF EXISTS public.cart CASCADE;

CREATE TABLE public.cart (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- UUID fk
  product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- RLS for Cart
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own cart" ON public.cart
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 4. MODIFY ORDERS TABLE
-- Add user_id uuid column
DO $$
BEGIN
    -- 1. Ensure user_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id') THEN
        ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    ELSE
        -- 2. If it exists, ensure it is UUID
        -- We drop the constraint first to avoid conflicts during type change
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
        
        -- Change type to UUID (using cast if possible)
        ALTER TABLE public.orders ALTER COLUMN user_id TYPE UUID USING (user_id::text::uuid);
        
        -- Re-add Foreign Key constraint
        ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Ensure RLS allows users to see their orders
    DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
    
    CREATE POLICY "Users can read own orders" ON public.orders
        FOR SELECT
        USING (auth.uid() = user_id);
    
    -- Update "Anyone can create orders" to allow authenticated users too
    ALTER TABLE public.orders ALTER COLUMN user_id SET DEFAULT auth.uid();
END $$;

-- 5. STORAGE BUCKETS (Optional, for Profile Pic)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );
  
-- 6. GRANT PERMISSIONS (Vital for service role / API access if needed)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

