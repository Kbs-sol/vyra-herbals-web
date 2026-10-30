-- Shiprocket admin control (run once in the Supabase SQL editor). Idempotent.
--
-- Stores the Shiprocket Checkout API key / secret / webhook token entered in
-- /admin/shiprocket so the owner does not need Vercel access or a redeploy.
--
-- WHY A NEW TABLE (and not site_settings): site_settings has a PUBLIC read
-- policy (the storefront reads it with the anon key). Anything secret in there
-- would be readable by every visitor. This table has RLS enabled and NO
-- policies, so the anon / authenticated roles get nothing; only the server's
-- service-role key can read or write it.
--
-- The three secret columns hold AES-256-GCM ciphertext (see
-- src/utils/shiprocketCrypto.ts), never plaintext.

CREATE TABLE IF NOT EXISTS public.shiprocket_credentials (
  id                 SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- single row
  api_key_enc        TEXT,
  api_secret_enc     TEXT,
  webhook_token_enc  TEXT,
  environment        TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shiprocket_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public shiprocket_credentials access" ON public.shiprocket_credentials;

REVOKE ALL ON public.shiprocket_credentials FROM anon, authenticated;
GRANT ALL ON public.shiprocket_credentials TO service_role;

COMMENT ON TABLE public.shiprocket_credentials IS
  'Encrypted Shiprocket Checkout credentials managed from /admin/shiprocket. Service-role only. Never add a SELECT policy.';

-- Also make sure the non-secret on/off + feature switches table exists
-- (same table the media / welcome-coupon settings already use).
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Duplicate-order guard for Shiprocket orders (same as SHIPROCKET_CHECKOUT_SETUP.sql).
CREATE UNIQUE INDEX IF NOT EXISTS orders_shiprocket_txn_id_uniq
  ON public.orders (txn_id)
  WHERE txn_id LIKE 'SR-%';
