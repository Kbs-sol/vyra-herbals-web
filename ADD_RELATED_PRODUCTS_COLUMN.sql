-- SQL Migration to add related_products column
ALTER TABLE products ADD COLUMN IF NOT EXISTS related_products BIGINT[];

-- Optional: Add a comment to the column
COMMENT ON COLUMN products.related_products IS 'Array of product IDs that are related to this product';
