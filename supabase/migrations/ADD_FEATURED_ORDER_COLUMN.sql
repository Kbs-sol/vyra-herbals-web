-- Add featured_order column to products table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'featured_order') THEN
        ALTER TABLE products ADD COLUMN featured_order INTEGER DEFAULT 0;
    END IF;
END $$;
