-- ========================================
-- FEATURED PRODUCTS SELECTION SETUP
-- ========================================

-- 1. Create the table to store the selected products for each position
CREATE TABLE IF NOT EXISTS featured_selection (
  position INTEGER PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL
);

-- 2. Insert default slots (Positions 1 to 4)
-- We use ON CONFLICT DO NOTHING to avoid errors if run multiple times
INSERT INTO featured_selection (position, product_id) VALUES
  (1, NULL),
  (2, NULL),
  (3, NULL),
  (4, NULL)
ON CONFLICT (position) DO NOTHING;

-- 3. Enable RLS (Optional, but good practice)
ALTER TABLE featured_selection ENABLE ROW LEVEL SECURITY;

-- 4. Create policies (Allow read to everyone, write to authenticated/admin)
-- Adjust 'authenticated' role as per your auth setup (maybe service_role for admin)
-- For simplicity in this script, we allow public read
CREATE POLICY "Public read access" ON featured_selection
  FOR SELECT USING (true);

-- Allow full access to authenticated users (admins)
CREATE POLICY "Admin full access" ON featured_selection
  FOR ALL USING (auth.role() = 'authenticated');
