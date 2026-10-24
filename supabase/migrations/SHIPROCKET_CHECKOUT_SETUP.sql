-- Shiprocket Checkout setup (run once in the Supabase SQL editor).
-- Credit: VJ <vijayprasadvvp@gmail.com>
--
-- The Shiprocket order webhook, the buyer's redirect back to the site and the
-- pending-order cron can all try to record the SAME order at the same moment.
-- The code checks first, but only the database can make that race impossible.
-- This partial unique index covers Shiprocket orders only ("SR-..." txn ids), so
-- it cannot conflict with any existing Easebuzz / COD row.
--
-- If this fails with "could not create unique index", you already have duplicate
-- SR- rows; none can exist before the integration goes live.

CREATE UNIQUE INDEX IF NOT EXISTS orders_shiprocket_txn_id_uniq
  ON public.orders (txn_id)
  WHERE txn_id LIKE 'SR-%';
