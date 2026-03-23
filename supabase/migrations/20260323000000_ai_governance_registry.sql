-- AI Governance & Compliance Registry Schema

-- 1. Enum for AI Risk Levels (based on EU AI Act)
CREATE TYPE ai_risk_level AS ENUM ('minimal', 'limited', 'high', 'unacceptable');

-- 2. Frameworks (e.g., EU AI Act, ISO 42001, UK GDPR)
CREATE TABLE IF NOT EXISTS public.ai_compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT NOT NULL, -- e.g., 'EU', 'UK', 'Global'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Registry of Active AI Features on the platform
CREATE TABLE IF NOT EXISTS public.ai_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT NOT NULL UNIQUE,
    description TEXT,
    system_type TEXT NOT NULL, -- e.g., 'LLM', 'Classifier', 'Redaction'
    risk_level ai_risk_level NOT NULL DEFAULT 'minimal',
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_explicit_consent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Mapping: Which feature must comply with which framework
CREATE TABLE IF NOT EXISTS public.ai_feature_framework_compliance (
    feature_id UUID NOT NULL REFERENCES public.ai_features(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES public.ai_compliance_frameworks(id) ON DELETE CASCADE,
    compliance_status TEXT NOT NULL DEFAULT 'pending', -- 'compliant', 'pending', 'assessment_required'
    last_audited_at TIMESTAMPTZ,
    PRIMARY KEY (feature_id, framework_id)
);

-- 5. AI Audit Logs (Organizational & Technical Dimension)
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID NOT NULL REFERENCES public.ai_features(id),
    user_id UUID, -- usually references auth.users
    action TEXT NOT NULL, -- e.g., 'inference_request', 'pii_redaction_trigger'
    context_data JSONB, -- stores sanitized payload metadata (NEVER PII)
    passed_privacy_gate BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feature_framework_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Read-only for public/authenticated users, insert for service roles)
CREATE POLICY "Frameworks are viewable by all users" 
ON public.ai_compliance_frameworks FOR SELECT USING (true);

CREATE POLICY "Active AI features are viewable by all users" 
ON public.ai_features FOR SELECT USING (is_active = true);

-- Audit logs should be highly restricted (Only internal service role or specific admins can read)
CREATE POLICY "Users can only view their own audit logs"
ON public.ai_audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER set_timestamp_frameworks
BEFORE UPDATE ON public.ai_compliance_frameworks
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_features
BEFORE UPDATE ON public.ai_features
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Seed initial Regulatory Frameworks
INSERT INTO public.ai_compliance_frameworks (name, region, description) VALUES
('EU AI Act', 'EU', 'European regulation on artificial intelligence based on risk tiers.'),
('ISO/IEC 42001', 'Global', 'Information technology — Artificial intelligence — Management system.'),
('UK GDPR & AI Guidelines', 'UK', 'Data protection and algorithmic transparency standards in the UK.');
