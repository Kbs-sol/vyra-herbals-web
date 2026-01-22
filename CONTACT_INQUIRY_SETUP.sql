-- 1. Create table for Contact Inquiries
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public can insert (Submit form)
CREATE POLICY "Public can submit inquiries" ON contact_inquiries
  FOR INSERT WITH CHECK (true);

-- 4. Policy: Admin/Service Role can read (View in Admin Panel)
-- Assuming service role key usage in admin routes, or if we use client-side with admin user:
-- For now, we'll allow authenticated users to read (assuming only admins log in) OR just rely on service role.
-- But to be safe for a client-side admin fetch:
CREATE POLICY "Enable read access for all users" ON contact_inquiries
    FOR SELECT USING (true);
