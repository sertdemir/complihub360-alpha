CREATE TABLE IF NOT EXISTS public.engagement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    provider_key TEXT NOT NULL,
    country TEXT NOT NULL,
    category TEXT NOT NULL,
    structured_answers JSONB,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.engagement_requests ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Users can view own engagement requests" 
ON public.engagement_requests FOR SELECT
USING (auth.uid() = user_id OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id');

-- Insert policies
CREATE POLICY "Anyone can create engagement requests" 
ON public.engagement_requests FOR INSERT
WITH CHECK (true);
