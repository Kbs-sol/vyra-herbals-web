-- =============================================
-- ADD STATUS TIMELINE COLUMN TO ORDERS TABLE
-- =============================================
-- This script adds a status_timeline column to the orders table
-- to track the history of order status changes (e.g., Placed -> Shipped -> Delivered)
-- =============================================

DO $$ 
BEGIN
  -- Add status_timeline column if it doesn't exist
  -- JSONB to store array of status objects: [{ "status": "placed", "timestamp": "...", ... }]
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'status_timeline'
  ) THEN
    ALTER TABLE orders ADD COLUMN status_timeline JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added status_timeline column to orders table';
  END IF;

END $$;

-- Create an index on the new column for potential future querying/filtering
CREATE INDEX IF NOT EXISTS idx_orders_status_timeline ON orders USING gin(status_timeline);
