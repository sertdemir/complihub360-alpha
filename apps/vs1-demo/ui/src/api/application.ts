import { apiFetch } from './client';
import { myProviderKey } from './provider';

// ─── Bewerbungsstrecke des Anbieters (Phase 2 Onboarding) ────────────────────
// Gegenstueck zu services/compliance-api/src/providerApplication.ts. Alle
// Routen liegen unter /api/v1/provider/:key/… und damit hinter dem
// Ownership-Guard: der Schluessel kommt aus /me/provider (myProviderKey).
//
// Der Upload eines Nachweises laeuft in drei Schritten, weil das Dokument die
// API nie beruehrt: (1) Upload-URL holen — die API legt die Zeile an und
// signiert eine PUT-URL in den privaten Bucket; (2) der Browser laedt die
// Datei direkt dorthin; (3) confirm — die API prueft, dass das Objekt liegt,
// und erst dann ist die Zeile ein Nachweis.

export type LifecycleStatus =
  | 'draft' | 'submitted' | 'more_info_required' | 'under_verification' | 'approved_pending_activation'
  | 'active' | 'limited' | 'reverification_due' | 'paused' | 'suspended' | 'terminated';

export type CoverageStatus = 'pending' | 'approved' | 'rejected' | 'limited' | 'suspended' | 'expired';
export type ServiceStatus = 'draft' | 'pending_verification' | 'approved' | 'limited' | 'paused' | 'retired';
export type EvidenceType = 'incorporation' | 'vat_id' | 'insurance' | 'representative_identity' | 'professional_licence';
export type ChecklistState = 'missing' | 'uploading' | 'received' | 'reviewed' | 'rejected' | 'expired';
export type AgreementType = 'provider_agreement' | 'privacy_notice' | 'billing_authorization' | 'commercial_terms';

export interface Coverage {
  id: string;
  service_id: string;
  country_code: string;
  jurisdiction_code: string | null;
  status: CoverageStatus;
  limitations: string | null;
  approved_at: string | null;
  expires_at: string | null;
}

export interface Service {
  id: string;
  service_code: string;
  service_name: string;
  description: string | null;
  pricing_model: 'fixed' | 'hourly' | 'retainer' | 'project' | 'mixed' | null;
  price_min: number | null;
  price_max: number | null;
  currency: string | null;
  pricing_basis: string | null;
  response_time_hours: number | null;
  completion_days_estimate: number | null;
  capacity_status: 'open' | 'limited' | 'full';
  status: ServiceStatus;
  coverage: Coverage[];
}

export interface ChecklistItem {
  type: EvidenceType;
  source: 'document' | 'registry_check';
  service_code: string | null;
  country_code: string | null;
  required_for_submit: boolean;
  state: ChecklistState;
  evidence_id: string | null;
}

export interface Evidence {
  id: string;
  evidence_type: EvidenceType;
  source: 'document' | 'registry_check';
  result: 'received' | 'reviewed' | 'independently_verified' | 'rejected' | 'expired';
  original_name: string | null;
  size_bytes: number | null;
  upload_confirmed: boolean;
  uploaded_at: string | null;
  identifier: string | null;
  expires_at: string | null;
  supports_countries: string[];
  supports_service_codes: string[];
}

export interface Agreement {
  agreement_type: AgreementType;
  version: string;
  language: string;
  accepted_at: string;
  accepted_by_name: string | null;
}

export interface EvidenceRequest {
  id: string;
  evidence_type: string;
  service_id: string | null;
  country_code: string | null;
  message: string;
  status: 'open' | 'fulfilled' | 'withdrawn';
  requested_at: string;
}

export interface Chapter { complete: boolean; missing: string[] }

export interface Application {
  provider: {
    provider_key: string; name: string; website_url: string | null; contact_email: string | null;
    languages: string[]; region: string | null; active_since: number | null;
    vat_id: string | null; vat_id_status: string | null; vat_id_checked_at: string | null;
    lifecycle_status: LifecycleStatus; lifecycle_status_since: string | null; lifecycle_status_reason: string | null;
    billing_ready: boolean; billing_block_reasons: string[];
  };
  confidential: {
    entity_type: string | null; registration_number: string | null; registered_address: string | null;
    operating_address: string | null; tax_number: string | null; representative_name: string | null;
    representative_title: string | null; insurance_provider: string | null; insurance_type: string | null;
    insurance_valid_until: string | null;
  } | null;
  chapters: { account: Chapter; legal: Chapter; services: Chapter; evidence: Chapter; agreements: Chapter; submit: { ready: boolean; missing: string[] } };
  services: Service[];
  checklist: ChecklistItem[];
  evidence: Evidence[];
  agreements: Agreement[];
  open_requests: EvidenceRequest[];
}

export interface ApplicationPatch {
  name?: string; contact_email?: string; website_url?: string; languages?: string[]; region?: string;
  entity_type?: string; registration_number?: string; registered_address?: string; operating_address?: string;
  tax_number?: string; representative_name?: string; representative_title?: string;
  insurance_provider?: string; insurance_type?: string; insurance_valid_until?: string;
}

const key = async (providerKey?: string) => providerKey ?? await myProviderKey();

export async function fetchApplication(providerKey?: string): Promise<Application> {
  return apiFetch<Application>(`/api/v1/provider/${await key(providerKey)}/application`);
}

export async function patchApplication(patch: ApplicationPatch, providerKey?: string): Promise<void> {
  await apiFetch(`/api/v1/provider/${await key(providerKey)}/application`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export interface ServiceInput {
  service_code: string; service_name?: string; description?: string;
  pricing_model?: Service['pricing_model']; price_min?: number | null; price_max?: number | null; currency?: string; pricing_basis?: string;
  response_time_hours?: number | null; completion_days_estimate?: number | null; capacity_status?: Service['capacity_status'];
}

export async function createService(input: ServiceInput, providerKey?: string): Promise<Service> {
  const res = await apiFetch<{ ok: boolean; service: Service }>(`/api/v1/provider/${await key(providerKey)}/services`, { method: 'POST', body: JSON.stringify(input) });
  return res.service;
}

export async function patchService(serviceId: string, patch: Partial<ServiceInput>, providerKey?: string): Promise<void> {
  await apiFetch(`/api/v1/provider/${await key(providerKey)}/services/${serviceId}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function removeService(serviceId: string, providerKey?: string): Promise<{ removed: boolean }> {
  return apiFetch<{ ok: boolean; removed: boolean }>(`/api/v1/provider/${await key(providerKey)}/services/${serviceId}`, { method: 'DELETE' });
}

export async function putCoverage(serviceId: string, countries: string[], providerKey?: string): Promise<Coverage[]> {
  const res = await apiFetch<{ ok: boolean; coverage: Coverage[] }>(`/api/v1/provider/${await key(providerKey)}/services/${serviceId}/coverage`, {
    method: 'PUT', body: JSON.stringify({ countries }),
  });
  return res.coverage;
}

export interface UploadTicket {
  evidence_id: string;
  file_ref: string;
  upload: { url: string; token: string; method: 'PUT'; headers: Record<string, string>; expiresAt: string };
}

export interface EvidenceMeta {
  evidence_type: Exclude<EvidenceType, 'vat_id'>;
  supports_service_codes?: string[];
  supports_countries?: string[];
  issuing_authority?: string;
  identifier?: string;
  issue_date?: string;
  expires_at?: string;
}

/** Schritt 1 + 2 + 3 in einem: Zeile anlegen, Datei direkt in den Bucket, bestaetigen. */
export async function uploadEvidence(file: File, meta: EvidenceMeta, providerKey?: string, onProgress?: (pct: number) => void): Promise<Evidence> {
  const k = await key(providerKey);
  const ticket = await apiFetch<UploadTicket>(`/api/v1/provider/${k}/evidence/upload-url`, {
    method: 'POST',
    body: JSON.stringify({ ...meta, original_name: file.name, mime_type: file.type, size_bytes: file.size }),
  });
  onProgress?.(10);
  const put = await fetch(ticket.upload.url, { method: 'PUT', headers: { ...ticket.upload.headers, Authorization: `Bearer ${ticket.upload.token}` }, body: file });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  onProgress?.(80);
  const res = await apiFetch<{ ok: boolean; evidence: Evidence }>(`/api/v1/provider/${k}/evidence/${ticket.evidence_id}/confirm`, { method: 'POST', body: '{}' });
  onProgress?.(100);
  return res.evidence;
}

export interface RegistryResult {
  evidence: Evidence;
  vat: { status: 'valid' | 'invalid' | 'unsupported' | 'unavailable'; vat_id: string; country_code: string; name: string | null; checked_at: string };
}

export async function checkVatRegistry(vatId: string, providerKey?: string): Promise<RegistryResult> {
  return apiFetch<RegistryResult>(`/api/v1/provider/${await key(providerKey)}/evidence/registry`, { method: 'POST', body: JSON.stringify({ evidence_type: 'vat_id', vat_id: vatId }) });
}

export async function acceptAgreement(input: { agreement_type: AgreementType; version: string; language: string; accepted_by_name: string; accepted_by_title?: string }, providerKey?: string): Promise<void> {
  await apiFetch(`/api/v1/provider/${await key(providerKey)}/agreements`, { method: 'POST', body: JSON.stringify(input) });
}

export interface SubmitResult { ok: boolean; lifecycle_status?: LifecycleStatus; missing?: string[] }

export async function submitApplication(providerKey?: string): Promise<SubmitResult> {
  return apiFetch<SubmitResult>(`/api/v1/provider/${await key(providerKey)}/submit`, { method: 'POST', body: '{}' });
}

export interface MatrixCell { coverage_id: string; country_code: string; jurisdiction_code: string | null; status: CoverageStatus; limitations: string | null; approved_at: string | null; expires_at: string | null }
export interface MatrixRow { service_id: string; service_code: string; service_name: string; status: ServiceStatus; cells: MatrixCell[] }
export interface HistoryEntry { id: string; subject: string; subject_id: string | null; action: string; from: string | null; to: string | null; reason: string | null; actor_kind: 'reviewer' | 'provider' | 'system'; created_at: string }

export interface Verification {
  lifecycle: { status: LifecycleStatus; since: string | null; reason: string | null; reverification_due_at: string | null; grace_until: string | null };
  matrix: MatrixRow[];
  checklist: ChecklistItem[];
  open_requests: EvidenceRequest[];
  history: HistoryEntry[];
}

export async function fetchVerification(providerKey?: string): Promise<Verification> {
  return apiFetch<Verification>(`/api/v1/provider/${await key(providerKey)}/verification`);
}
