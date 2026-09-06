-- ============================================================================
-- Row Level Security baseline for Vyra Herbals
-- ============================================================================
-- Run once in the Supabase SQL editor for the production project. Safe to
-- re-run: every policy is dropped before it is recreated.
--
-- WHY THIS EXISTS
-- The browser talks to Supabase with the public anon key, which is visible to
-- anyone who opens dev tools. Without RLS that key can read and write every
-- row in every table it can name. Several tables had RLS disabled outright, or
-- carried a `USING (true)` policy with no `TO` clause, which grants the same
-- access to the anon role as to the service role.
--
-- THE MODEL THIS ENCODES
--   * Server API routes use the service_role key, which bypasses RLS entirely.
--     Authorisation for those paths lives in the route handlers.
--   * The browser may only ever touch its own rows, plus public catalogue
--     content. It directly reads/writes exactly five tables today:
--     cart, wishlist, users, user_addresses, contact_inquiries.
--   * Tables with RLS enabled and NO policy are reachable only by the service
--     role. That is the intended, deliberate state for anything holding
--     money, secrets or pre-payment state.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Schema prerequisite.
--
-- `transactions` was created without a `user_id`, so payments could not be tied
-- to an account and the ownership policy below would have nothing to match on.
-- /api/payment/access now writes this column, so APPLY THIS MIGRATION BEFORE
-- DEPLOYING the accompanying code — otherwise that insert fails and checkout
-- breaks.
-- ---------------------------------------------------------------------------

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- ---------------------------------------------------------------------------
-- 1. Per-customer data: a signed-in user sees and edits only their own rows.
-- ---------------------------------------------------------------------------

ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role cart access" ON cart;
DROP POLICY IF EXISTS "Users manage own cart" ON cart;
CREATE POLICY "Users manage own cart" ON cart
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role wishlist access" ON wishlist;
DROP POLICY IF EXISTS "Users manage own wishlist" ON wishlist;
CREATE POLICY "Users manage own wishlist" ON wishlist
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Supersedes the wide-open "Service role user_addresses access" policy and the
-- later ALTER TABLE ... DISABLE ROW LEVEL SECURITY that left this table open.
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role user_addresses access" ON user_addresses;
DROP POLICY IF EXISTS "Users can view own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON user_addresses;
CREATE POLICY "Users can manage their own addresses" ON user_addresses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profiles are read-only from the browser. Writes go through server routes, so
-- a customer cannot promote themselves by updating their own `role` column.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Public users access" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. Orders and money: readable by their owner, never writable from a browser.
--    All order creation happens server-side after payment confirmation.
-- ---------------------------------------------------------------------------

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own orders" ON orders;
DROP POLICY IF EXISTS "Public orders access" ON orders;
CREATE POLICY "Users can read their own orders" ON orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Pre-payment basket snapshots. Service role only: no policy is created on
-- purpose, so the anon key cannot read or forge a pending order payload.
ALTER TABLE order_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public order_sessions access" ON order_sessions;

-- ---------------------------------------------------------------------------
-- 3. Public catalogue content: world-readable, writable only by the service
--    role (i.e. through the authenticated admin API).
-- ---------------------------------------------------------------------------

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read products" ON products;
CREATE POLICY "Public can read products" ON products
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read categories" ON categories;
CREATE POLICY "Public can read categories" ON categories
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read blogs" ON blogs;
CREATE POLICY "Public can read blogs" ON blogs
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE before_after_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read before_after_images" ON before_after_images;
CREATE POLICY "Public can read before_after_images" ON before_after_images
  FOR SELECT TO anon, authenticated USING (true);

-- Only approved rows are public; pending and rejected submissions stay hidden
-- until an admin moderates them.
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read approved reviews" ON reviews;
DROP POLICY IF EXISTS "Public reviews access" ON reviews;
CREATE POLICY "Public can read approved reviews" ON reviews
  FOR SELECT TO anon, authenticated USING (status = 1);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read visible testimonials" ON testimonials;
CREATE POLICY "Public can read visible testimonials" ON testimonials
  FOR SELECT TO anon, authenticated USING (status = 1);

-- ---------------------------------------------------------------------------
-- 4. Contact form: anonymous visitors may submit, nobody may read back.
-- ---------------------------------------------------------------------------

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON contact_inquiries;
DROP POLICY IF EXISTS "Public contact_inquiries access" ON contact_inquiries;
CREATE POLICY "Anyone can submit an inquiry" ON contact_inquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. Service-role-only tables. RLS on, no policies: the anon key gets nothing.
--    Coupon definitions in particular must not be enumerable — that would hand
--    every visitor the full list of active discount codes.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'coupons',
    'coupon_usages',
    'site_settings'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "Public %s access" ON public.%I', t, t);
    END IF;
  END LOOP;
END $$;

-- Optional catalogue tables that may not exist in every environment.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'product_ingredients',
    'featured_selection'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "Public can read %s" ON public.%I', t, t);
      EXECUTE format(
        'CREATE POLICY "Public can read %s" ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFY
-- Every table below should report rowsecurity = true.
-- ============================================================================
-- SELECT tablename, rowsecurity
--   FROM pg_tables
--  WHERE schemaname = 'public'
--  ORDER BY rowsecurity, tablename;
--
-- And list the surviving policies:
-- SELECT tablename, policyname, roles, cmd
--   FROM pg_policies
--  WHERE schemaname = 'public'
--  ORDER BY tablename, policyname;
