-- =============================================================================
-- WhatsApp Inbox: extend `whatsapp_messages` for bidirectional threads
-- =============================================================================
-- Vyra already has a `whatsapp_messages` table that stores OUTBOUND template
-- sends (order_placed, shipment_created, delivery_updates …). Meta's Cloud API
-- delivers INBOUND customer replies to /api/webhooks/whatsapp but nothing was
-- persisting them, so the admin panel had no inbox.
--
-- This migration:
--   1. Adds `direction`, `body_text` and `interactive_reply` columns so
--      inbound and outbound both live in one table (one thread per phone).
--   2. Adds `is_read` + `read_at` so the admin dashboard can show unread
--      badges without a second table.
--   3. Adds indexes that the inbox list & thread queries need.
--   4. Extends the CHECK constraint on `status` to accept 'received' — the
--      inbound-message state.
--
-- Safe to re-run: every ALTER is IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS direction TEXT
    NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound'));

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS body_text TEXT;

-- Cache the interactive reply payload for inbound button/list picks so the
-- admin sees "customer tapped: Track Order" without joining the raw metadata.
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS interactive_reply TEXT;

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS profile_name TEXT; -- Meta gives us "profile.name" on inbound.

-- Extend the status check to allow 'received' (inbound) alongside outbound states.
-- Note: the DO block below is defensive — Postgres will error if we try to
-- ALTER a check that does not exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND constraint_name = 'whatsapp_messages_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_messages DROP CONSTRAINT whatsapp_messages_status_check;
  END IF;
  ALTER TABLE public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_status_check
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'received'));
END $$;

-- --------------------------------------------------------------------------
-- Indexes for inbox performance
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS whatsapp_messages_phone_created_idx
  ON public.whatsapp_messages (customer_phone, created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_messages_direction_unread_idx
  ON public.whatsapp_messages (direction, is_read)
  WHERE direction = 'inbound' AND is_read = FALSE;

-- --------------------------------------------------------------------------
-- Conversations view — one row per customer phone, aggregating the latest
-- message and unread count. Used by /api/admin/whatsapp/conversations.
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.whatsapp_conversations CASCADE;

CREATE VIEW public.whatsapp_conversations AS
SELECT
  customer_phone                                                          AS phone,
  MAX(profile_name) FILTER (WHERE profile_name IS NOT NULL)                AS profile_name,
  MAX(created_at)                                                          AS last_message_at,
  (
    SELECT COALESCE(body_text, template_name, interactive_reply, '')
    FROM public.whatsapp_messages m2
    WHERE m2.customer_phone = m1.customer_phone
    ORDER BY m2.created_at DESC
    LIMIT 1
  )                                                                        AS last_message_preview,
  (
    SELECT direction
    FROM public.whatsapp_messages m3
    WHERE m3.customer_phone = m1.customer_phone
    ORDER BY m3.created_at DESC
    LIMIT 1
  )                                                                        AS last_direction,
  COUNT(*) FILTER (WHERE direction = 'inbound' AND is_read = FALSE)        AS unread_count,
  COUNT(*)                                                                 AS total_messages
FROM public.whatsapp_messages m1
GROUP BY customer_phone;

-- --------------------------------------------------------------------------
-- Row Level Security — only the service-role key (server-side) is allowed
-- to read/write. The admin panel calls this table through the server via
-- API routes, never from the browser.
-- --------------------------------------------------------------------------
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access" ON public.whatsapp_messages;
CREATE POLICY "service_role_full_access" ON public.whatsapp_messages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
