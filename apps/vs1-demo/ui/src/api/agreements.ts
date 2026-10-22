import { apiFetch } from './client';

// ─── Beta-Vereinbarung (Canvas-Wahl 1A · 2A · 3A+3C · 4C, 22.10.2026) ────────
// Der Text kommt vom Server (user_agreements, versioniert, je Sprache); die
// Annahme je Nutzer ist append-only. Drei Aufrufe, dieselben Namen wie in
// @complihub360/types/agreements.

export type UserAgreementName = 'beta' | 'terms';

export interface UserAgreementPoint { lead: string; text: string }

export interface UserAgreement {
  agreement: UserAgreementName;
  version: string;
  language: string;
  title: string;
  points: UserAgreementPoint[];
  effectiveFrom: string;
}

export interface UserAgreementState {
  agreement: UserAgreementName;
  currentVersion: string | null;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  language: string | null;
  /** true: eine Fassung gilt, die der Nutzer noch nicht angenommen hat. */
  required: boolean;
}

type AgreementWire = { ok: boolean; agreement: UserAgreementName; version: string; language: string; title: string; points: UserAgreementPoint[]; effective_from: string };
type StateWire = { agreement: UserAgreementName; current_version: string | null; accepted_version: string | null; accepted_at: string | null; language: string | null; required: boolean };

export async function fetchAgreement(name: UserAgreementName, lang: string): Promise<UserAgreement> {
  const res = await apiFetch<AgreementWire>(`/api/v1/agreements/${name}?lang=${encodeURIComponent(lang.slice(0, 2))}`);
  return { agreement: res.agreement, version: res.version, language: res.language, title: res.title, points: res.points ?? [], effectiveFrom: res.effective_from };
}

export async function fetchMyAgreements(lang: string): Promise<Record<UserAgreementName, UserAgreementState>> {
  const res = await apiFetch<{ ok: boolean; agreements: Record<UserAgreementName, StateWire> }>(`/api/v1/me/agreements?lang=${encodeURIComponent(lang.slice(0, 2))}`);
  const map = {} as Record<UserAgreementName, UserAgreementState>;
  for (const [k, v] of Object.entries(res.agreements ?? {}) as Array<[UserAgreementName, StateWire]>) {
    map[k] = { agreement: v.agreement, currentVersion: v.current_version, acceptedVersion: v.accepted_version, acceptedAt: v.accepted_at, language: v.language, required: !!v.required };
  }
  return map;
}

export async function acceptAgreement(name: UserAgreementName, version: string, lang: string): Promise<{ version: string; language: string; acceptedAt: string; replay: boolean }> {
  const res = await apiFetch<{ ok: boolean; version: string; language: string; accepted_at: string; replay?: boolean }>(`/api/v1/me/agreements/${name}`, {
    method: 'POST',
    body: JSON.stringify({ version, language: lang.slice(0, 2) }),
  });
  return { version: res.version, language: res.language, acceptedAt: res.accepted_at, replay: !!res.replay };
}
