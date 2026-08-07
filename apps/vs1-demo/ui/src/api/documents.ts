import { apiFetch } from './client';

// ─── Documents API ────────────────────────────────────────────────────────────
// POST /api/v1/document/upload — the privacy pipeline entrance: the API redacts
// BEFORE persisting (only sanitized content is stored) and derives the AI gate
// from sanitized_ready ∧ classification ∧ explicit consent.

export interface RedactionReport {
  countsByType?: Record<string, number>;
  riskScore?: number;
}

export interface UploadResult {
  id: string;
  sanitized_ready: boolean;
  consent_ai: boolean;
  ai_allowed: boolean;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  report: RedactionReport;
}

export async function uploadDocument(input: {
  filename: string;
  mimeType?: string;
  text: string;
  consentAI: boolean;
  engagementId?: string;
}): Promise<UploadResult> {
  const res = await apiFetch<{ ok: boolean } & UploadResult>('/api/v1/document/upload', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res;
}
