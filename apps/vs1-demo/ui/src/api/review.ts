import { apiFetch } from './client';
import type { Agreement, ChecklistItem, CoverageStatus, Evidence, EvidenceRequest, HistoryEntry, LifecycleStatus, MatrixRow, Service } from './application';

// ─── Review-Arbeitsplatz (Phase 2 Onboarding, Adminseite) ────────────────────
// Gegenstueck zu services/compliance-api/src/providerReview.ts. Alle Routen
// unter /api/v1/admin/review/… — Admin-JWT oder Server-Key, sonst 403.

export type QueueKind = 'application' | 'reverification' | 'change_request' | 'expiring_evidence';
export type Risk = 'high' | 'medium' | 'low';

export interface QueueRow {
  kind: QueueKind;
  provider_key: string;
  provider_name: string;
  lifecycle_status: LifecycleStatus;
  since: string | null;
  due_at: string | null;
  risk: Risk;
  detail: string | null;
  ref_id: string | null;
}

export interface Queue { rows: QueueRow[]; counts: { total: number; high: number; applications: number } }

export async function fetchQueue(): Promise<Queue> {
  return apiFetch<Queue>('/api/v1/admin/review/queue');
}

export interface Gate {
  ok: boolean;
  missing: string[];
  target: 'active' | 'limited';
  approved_cells: number;
  total_cells: number;
  allowance: { ok: boolean; over: string[]; allowance: number | null; plan: string | null } | null;
}

export interface ReviewEvidence extends Evidence {
  reviewer_notes: string | null;
  reviewed_at: string | null;
  download_url: string | null;
  download_expires_in_sec: number | null;
  issuing_authority: string | null;
  covered_entity: string | null;
  registry_reference: string | null;
}

export interface ReviewDossier {
  provider: Record<string, unknown> & { provider_key: string; name: string; lifecycle_status: LifecycleStatus; lifecycle_status_since?: string | null; lifecycle_status_reason?: string | null; contact_email?: string | null; billing_ready?: boolean; billing_block_reasons?: string[] };
  confidential: Record<string, string | null> | null;
  has_dashboard_user: boolean;
  services: Service[];
  matrix: MatrixRow[];
  checklist: ChecklistItem[];
  evidence: ReviewEvidence[];
  registry: { vat: { vat_id: string | null; status: string | null; checked_at: string | null } };
  agreements: Agreement[];
  required_agreements: string[];
  open_requests: EvidenceRequest[];
  gate: Gate;
  history: Array<HistoryEntry & { from_value?: string | null; to_value?: string | null; actor_id?: string | null }>;
}

export async function fetchReviewDossier(providerKey: string): Promise<ReviewDossier> {
  return apiFetch<ReviewDossier>(`/api/v1/admin/review/${providerKey}`);
}

export async function fetchGate(providerKey: string): Promise<Gate> {
  const res = await apiFetch<{ ok: boolean; gate: Gate }>(`/api/v1/admin/review/${providerKey}/gate`);
  return res.gate;
}

export type EvidenceDecision = 'reviewed' | 'independently_verified' | 'rejected' | 'expired';

export async function decideEvidence(providerKey: string, evidenceId: string, input: { result: EvidenceDecision; notes?: string; expires_at?: string; next_review_at?: string; limitations?: string }): Promise<void> {
  await apiFetch(`/api/v1/admin/review/${providerKey}/evidence/${evidenceId}`, { method: 'POST', body: JSON.stringify(input) });
}

export type CellAction = 'approve' | 'limit' | 'reject' | 'pause' | 'request_info' | 'reopen';

export interface CellDecision { coverage?: { status: CoverageStatus }; service_status?: string; request?: EvidenceRequest; lifecycle_status?: LifecycleStatus }

export async function decideCoverage(providerKey: string, coverageId: string, input: { action: CellAction; reason?: string; limitations?: string; expires_at?: string; evidence_type?: string }): Promise<CellDecision> {
  return apiFetch<CellDecision>(`/api/v1/admin/review/${providerKey}/coverage/${coverageId}`, { method: 'POST', body: JSON.stringify(input) });
}

export interface LifecycleResult { ok: boolean; from?: LifecycleStatus; to?: LifecycleStatus; gate?: Gate | null; errorCode?: string }

export async function setLifecycle(providerKey: string, to: LifecycleStatus, reason?: string): Promise<LifecycleResult> {
  return apiFetch<LifecycleResult>(`/api/v1/admin/review/${providerKey}/lifecycle`, { method: 'POST', body: JSON.stringify({ to, reason }) });
}

export async function requestInfo(providerKey: string, input: { evidence_type: string; message: string; service_id?: string; country_code?: string }): Promise<EvidenceRequest> {
  const res = await apiFetch<{ ok: boolean; request: EvidenceRequest }>(`/api/v1/admin/review/${providerKey}/request`, { method: 'POST', body: JSON.stringify(input) });
  return res.request;
}

export async function withdrawRequest(providerKey: string, requestId: string): Promise<void> {
  await apiFetch(`/api/v1/admin/review/${providerKey}/request/${requestId}`, { method: 'DELETE' });
}
