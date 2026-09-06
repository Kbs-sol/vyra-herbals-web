-- Fix default value for featured_order so that 0 doesn't take priority over 1, 2, etc.
ALTER TABLE products ALTER COLUMN featured_order SET DEFAULT 9999;
UPDATE products SET featured_order = 9999 WHERE featured_order = 0;
