-- Add shipping details columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS awb_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_shipment_id ON orders(shipment_id);
CREATE INDEX IF NOT EXISTS idx_orders_awb_code ON orders(awb_code);
