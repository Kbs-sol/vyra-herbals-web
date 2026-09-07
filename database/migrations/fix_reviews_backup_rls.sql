-- 1. Enable Row Level Security (RLS) on the backup table
ALTER TABLE public.reviews_backup ENABLE ROW LEVEL SECURITY;

-- 2. (Optional but recommended) Allow ONLY the backend server to access it
-- The service_role key bypasses RLS anyway, but if you want to be explicit:
CREATE POLICY "Deny all public access to reviews backup"
ON public.reviews_backup
FOR ALL
TO public, anon, authenticated
USING (false)
WITH CHECK (false);
