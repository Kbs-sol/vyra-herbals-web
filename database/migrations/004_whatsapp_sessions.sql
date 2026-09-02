-- Migration: Create WhatsApp Sessions table for Bot State Management
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    phone_number TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'IDLE',
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role access (Next.js backend)
CREATE POLICY "Service role can manage whatsapp sessions"
ON public.whatsapp_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist (using existing trigger if possible)
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
