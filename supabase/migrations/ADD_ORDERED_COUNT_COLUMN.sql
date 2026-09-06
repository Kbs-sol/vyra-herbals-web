-- Add manual ordered count column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS ordered_count_30_days INTEGER DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN products.ordered_count_30_days IS 'Manually updated count of people who ordered this product in the last 30 days';
