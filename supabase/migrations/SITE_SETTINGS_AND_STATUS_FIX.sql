-- =============================================================================
-- SITE_SETTINGS_AND_STATUS_FIX.sql
-- =============================================================================
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste →
-- Run). Idempotent — safe to re-run.
--
-- What this migration does:
--   1. Creates the `site_settings` table used by the new /admin/media Site
--      Media section (hero video, review videos, founder image, default OG
--      image, welcome-coupon config, etc.). The admin API currently fails
--      with "site_settings table missing" because this table doesn't exist.
--   2. Normalises `products.status` from Postgres "unknown" type to a proper
--      SMALLINT with a sensible default. All 29 existing rows have
--      `status = NULL`; we default them to 1 (= live) so future filters that
--      check `.eq('status', 1)` also match them. Archived rows should later
--      be flipped to 0 via the admin panel.
--   3. Same normalisation for `blogs.status`.
--   4. Adds a public read policy on `site_settings` so /api/site-media (the
--      unauthenticated public read used by src/Components/Home/Video.tsx) can
--      resolve media overrides at page-load. Writes remain service-role only
--      (the admin API uses the service role key which bypasses RLS).
--
-- Rollback (only if you truly need to): DROP TABLE site_settings CASCADE.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. site_settings — key/value store for admin-editable site-wide overrides
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.site_settings IS
  'Admin-editable key/value store. Used by /admin/media (Site Media section) '
  'for hero/review video URLs, founder image, and default OG image, plus '
  'welcome-coupon toggle. Keys of the form "media_<slot>" are consumed by '
  'src/utils/siteMedia.ts.';

-- Keep updated_at fresh on every UPDATE
CREATE OR REPLACE FUNCTION public.set_site_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.set_site_settings_updated_at();

-- Row-Level Security -------------------------------------------------------
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public read: needed so /api/site-media (used by the homepage Video component
-- and any other public route) can resolve overrides without an admin session.
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- Writes are service-role only (bypasses RLS automatically via
-- createServerSupabase in the admin API). No INSERT/UPDATE/DELETE policy is
-- defined for anon/authenticated on purpose.

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL   ON public.site_settings TO service_role;

-- Seed the 8 media slots as empty rows so the admin sees them immediately.
-- Blank url = fallback to hardcoded / env var per src/utils/siteMedia.ts.
INSERT INTO public.site_settings (key, value) VALUES
  ('media_hero_video',      jsonb_build_object('url', '', 'kind', 'youtube-id')),
  ('media_review_video_1',  jsonb_build_object('url', '', 'kind', 'youtube-id')),
  ('media_review_video_2',  jsonb_build_object('url', '', 'kind', 'youtube-id')),
  ('media_review_video_3',  jsonb_build_object('url', '', 'kind', 'youtube-id')),
  ('media_review_video_4',  jsonb_build_object('url', '', 'kind', 'youtube-id')),
  ('media_review_video_5',  jsonb_build_object('url', '', 'kind', 'youtube-id')),
  ('media_founder_image',   jsonb_build_object('url', '', 'kind', 'image')),
  ('media_og_image',        jsonb_build_object('url', '', 'kind', 'image'))
ON CONFLICT (key) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. products.status — normalise from "unknown" -> SMALLINT DEFAULT 1
-- -----------------------------------------------------------------------------
-- Existing 29 rows all have NULL. Backfill to 1 (= live) first so no product
-- disappears, then constrain the column and set the default for future rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'status'
  ) THEN
    -- Backfill NULLs -> 1 (interpret existing rows as "live")
    UPDATE public.products SET status = 1 WHERE status IS NULL;

    -- Force the column to SMALLINT (safe: existing values are '1' or NULL)
    BEGIN
      ALTER TABLE public.products
        ALTER COLUMN status TYPE SMALLINT USING (status::text::smallint);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'products.status already normalised or values incompatible — skipping type cast.';
    END;

    -- Default new rows to 1 (= live)
    ALTER TABLE public.products ALTER COLUMN status SET DEFAULT 1;

    -- Optional: NOT NULL guard (uncomment if you're sure no row will ever be NULL)
    -- ALTER TABLE public.products ALTER COLUMN status SET NOT NULL;
  END IF;
END;
$$;

COMMENT ON COLUMN public.products.status IS
  'Publish state. 1 = live (default), 0 = archived / hidden from storefront '
  'and Merchant Center feed. Any positive value other than 0 is treated as live.';


-- -----------------------------------------------------------------------------
-- 3. blogs.status — same normalisation
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'blogs'
      AND column_name  = 'status'
  ) THEN
    UPDATE public.blogs SET status = 1 WHERE status IS NULL;
    BEGIN
      ALTER TABLE public.blogs
        ALTER COLUMN status TYPE SMALLINT USING (status::text::smallint);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'blogs.status already normalised or values incompatible — skipping type cast.';
    END;
    ALTER TABLE public.blogs ALTER COLUMN status SET DEFAULT 1;
  END IF;
END;
$$;

COMMENT ON COLUMN public.blogs.status IS
  'Publish state. 1 = live (default), 0 = draft / hidden.';


-- -----------------------------------------------------------------------------
-- 4. Sanity report — run these queries after the migration to confirm state
-- -----------------------------------------------------------------------------
--   SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_schema='public' AND table_name IN ('products','blogs','site_settings')
--      AND column_name IN ('status','key','value','updated_at')
--    ORDER BY table_name, column_name;
--
--   SELECT status, COUNT(*) FROM public.products GROUP BY status;
--   SELECT status, COUNT(*) FROM public.blogs GROUP BY status;
--   SELECT key, value FROM public.site_settings WHERE key LIKE 'media_%' ORDER BY key;
--
-- Expected:
--   - products.status: SMALLINT, default 1
--   - blogs.status:    SMALLINT, default 1
--   - site_settings has 8 media_ rows with empty JSON urls
--   - COUNT of products with status=1 == 29
-- =============================================================================
