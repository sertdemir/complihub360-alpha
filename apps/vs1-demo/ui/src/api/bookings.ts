import { myProviderKey } from './provider';
import { apiFetch, ApiError } from './client';
import type { RankBasis } from './search';

// ─── Bookings (Termine) — user side ──────────────────────────────────────────
// Matchmaking v2: the booking IS the paid lead; provider identity is revealed
// at booking time (spec §5 stage 3), so rows legitimately carry the clear name.
// GET /api/v1/bookings · PATCH /api/v1/scheduling/:id (cancel / outcome).

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface UserBooking {
  id: string;
  /** Opaker Anbieter-Bezeichner (Phase 3) — nie der Schluessel. */
  publicRef: string | null;
  /** Klarname ab der Offenlegung, davor "Verified Provider". */
  providerName: string;
  /** "Tax and VAT · Norditalien" — die Beschreibung, unter der der Anbieter vor der Buchung stand. */
  providerDescriptor: string;
  providerRegion: string | null;
  providerWebsite: string | null;  // affiliate 1b — post-booking reveal only
  identityRevealed: boolean;
  slotStart: string;      // ISO
  slotEnd: string | null;
  status: BookingStatus;
  message: string | null;
}

interface ApiBookingRow {
  id: string;
  public_ref: string | null;
  provider_name: string;
  provider_descriptor: string;
  provider_region: string | null;
  provider_website: string | null;
  identity_revealed: boolean;
  slot_start: string;
  slot_end: string | null;
  status: BookingStatus;
  message: string | null;
}

// Affiliate 1b: the counted outclick URL to a provider's website. The server
// verifies the caller has booked this provider, logs the click and 302-
// redirects — so this is a plain <a href>, not an apiFetch.
export function providerWebsiteHref(publicRef: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) || '';
  return `${base}/api/v1/p/${publicRef}/website`;
}

export async function fetchUserBookings(): Promise<UserBooking[]> {
  const res = await apiFetch<{ ok: boolean; bookings: ApiBookingRow[] }>('/api/v1/bookings');
  return (res.bookings || []).map((b) => ({
    id: b.id,
    publicRef: b.public_ref ?? null,
    providerName: b.provider_name,
    providerDescriptor: b.provider_descriptor ?? '',
    providerRegion: b.provider_region,
    identityRevealed: !!b.identity_revealed,
    providerWebsite: b.provider_website,
    slotStart: b.slot_start,
    slotEnd: b.slot_end,
    status: b.status,
    message: b.message,
  }));
}

// ─── Provider side: paid leads ───────────────────────────────────────────────
// Phase 4 (ADR-0005): je Lead steht, was er gekostet hat — Band, Standard-
// gebuehr, Rabatt, Endbetrag — und die 10 % fuer den Nutzer samt der
// Selbstauskunft des Anbieters („Angebot erstellt", „Rabatt gezeigt").
export type LeadPaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'n/a';

export interface ProviderBookingLead {
  band: 1 | 2 | 3 | 4;
  standardFeeCents: number;
  discountPct: number;
  discountSequence: number | null;
  finalFeeCents: number;
  currency: string;
  paymentStatus: LeadPaymentStatus;
  feeEnabled: boolean;
}

export interface LeadProposal {
  proposalIssued: boolean;
  discountShown: boolean;
  reportedAt: string;
}

export interface ProviderBooking {
  id: string;
  slotStart: string;
  slotEnd: string | null;
  status: BookingStatus;
  leadCharged: boolean;
  userEmail: string | null;  // dossier: identity delivered at booking
  message: string | null;
  /** null = Buchung aus der Zeit vor Phase 4, ohne Ledger. */
  lead: ProviderBookingLead | null;
  /** Der Rabatt, den der Nutzer von diesem Anbieter erwartet (eingefroren zur Buchung). */
  userDiscountPct: number | null;
  proposal: LeadProposal | null;
  acknowledgementVersion: string | null;
}

interface ApiProviderBookingRow {
  id: string; slot_start: string; slot_end: string | null; status: BookingStatus; lead_charged: boolean; user_email: string | null; message: string | null;
  lead?: { band: 1 | 2 | 3 | 4; standard_fee_cents: number; discount_pct: number; discount_sequence: number | null; final_fee_cents: number; currency: string; payment_status: LeadPaymentStatus; fee_enabled: boolean } | null;
  user_discount_pct?: number | null;
  proposal?: { proposal_issued: boolean; discount_shown: boolean; reported_at: string } | null;
  acknowledgement_version?: string | null;
}

export async function fetchProviderBookings(providerKey?: string): Promise<ProviderBooking[]> {
  const key = providerKey ?? await myProviderKey();
  const res = await apiFetch<{ ok: boolean; bookings: ApiProviderBookingRow[] }>(`/api/v1/provider/${key}/bookings`);
  return (res.bookings || []).map((b) => ({
    id: b.id,
    slotStart: b.slot_start,
    slotEnd: b.slot_end,
    status: b.status,
    leadCharged: b.lead_charged,
    userEmail: b.user_email,
    message: b.message,
    lead: b.lead ? {
      band: b.lead.band, standardFeeCents: b.lead.standard_fee_cents, discountPct: b.lead.discount_pct, discountSequence: b.lead.discount_sequence,
      finalFeeCents: b.lead.final_fee_cents, currency: b.lead.currency, paymentStatus: b.lead.payment_status, feeEnabled: b.lead.fee_enabled,
    } : null,
    userDiscountPct: b.user_discount_pct ?? null,
    proposal: b.proposal ? { proposalIssued: b.proposal.proposal_issued, discountShown: b.proposal.discount_shown, reportedAt: b.proposal.reported_at } : null,
    acknowledgementVersion: b.acknowledgement_version ?? null,
  }));
}

/** Selbstauskunft des Anbieters je Lead (Spec B „Mandatory user discount"):
 *  Angebot erstellt? 10 % ausgewiesen? Ein Rabatt ohne Angebot ist unmoeglich —
 *  der Server antwortet dann 400, die Oberflaeche laesst es gar nicht erst zu. */
export async function reportProposal(bookingId: string, r: { proposalIssued: boolean; discountShown: boolean }, providerKey?: string): Promise<LeadProposal> {
  const key = providerKey ?? await myProviderKey();
  const res = await apiFetch<{ ok: boolean; proposal: { proposal_issued: boolean; discount_shown: boolean; reported_at: string } }>(`/api/v1/provider/${key}/bookings/${bookingId}/proposal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposal_issued: r.proposalIssued, discount_shown: r.proposalIssued && r.discountShown }),
  });
  return { proposalIssued: res.proposal.proposal_issued, discountShown: res.proposal.discount_shown, reportedAt: res.proposal.reported_at };
}

// ─── Stage-2 detail + native scheduling (Phase-3 wiring) ─────────────────────
// GET /p/:ref/detail — the still-anonymous detail payload (fires
// provider_detail_opened server-side, deduped 1×/user/30d — analytics only
// since Pricing v2, ADR-0003; it is not billed). Seit Phase 3 (ADR-0004)
// entscheidet das Sichtbarkeits-Register, welche Felder hier ankommen:
// Freitexte sind durch das Identitaets-Netz gelaufen, `confirmation_rate`
// und `countries_supported` (Klasse internal) fehlen — Maerkte kommen als
// `markets` aus der View, die Bestaetigungsrate als Aussage in `rank_basis`.
export interface ProviderDetail {
  public_ref: string;
  /** "Tax and VAT · Norditalien" — kein Buchstabe: den kennt nur die Liste. */
  descriptor: string;
  region: string | null;
  active_since: number | null;
  specializations: string[];
  /** Maerkte, in denen mindestens eine Leistung freigegeben ist. */
  markets: string[];
  languages: string[];
  rating: number | null;
  completed_count: number | null;
  avg_response_hours: number | null;
  billing_model: 'abo' | 'hourly' | 'project' | 'mixed';
  pricing_table: Array<{ service: string; price: string }> | null;
  is_verified: boolean;
  availability: 'available' | 'ooo';
  rank_basis?: RankBasis;
  /** Dossier (Partnerseite 3B). null = der Anbieter hat nichts hinterlegt —
   *  die Karte sagt das, statt eine Leistung zu erfinden. */
  services?: Array<{ title: string; includes?: string[] }> | null;
  credentials?: Array<{ label: string; note?: string | null }> | null;
  excluded_services?: string[] | null;
  work_mode?: string | null;
}

/** Eine Bewertung, die an einer echten Buchung haengt. Der Server gibt nur
 *  solche heraus; ohne Buchung waere ein Stern eine Behauptung. */
export interface ProviderReview {
  rating: number;
  body: string | null;
  categories: string[];
  created_at: string;
}

export async function fetchProviderDetail(publicRef: string): Promise<ProviderDetail> {
  const res = await apiFetch<{ ok: boolean; detail: ProviderDetail }>(`/api/v1/p/${publicRef}/detail`);
  return res.detail;
}

export async function fetchProviderReviews(publicRef: string): Promise<{ reviews: ProviderReview[]; count: number; average: number | null }> {
  const res = await apiFetch<{ ok: boolean; reviews: ProviderReview[]; summary: { count: number; average: number | null } }>(`/api/v1/p/${publicRef}/reviews`);
  return { reviews: res.reviews || [], count: res.summary?.count ?? 0, average: res.summary?.average ?? null };
}

export async function fetchSlots(publicRef: string): Promise<string[]> {
  const res = await apiFetch<{ ok: boolean; slots: string[] }>(`/api/v1/p/${publicRef}/slots`);
  return res.slots || [];
}

// ─── Phase 4: Bestaetigung vor der Buchung (ADR-0005) ────────────────────────
// Der Text, den der Nutzer vor dem Klick liest: was fliesst, dass der Anbieter
// nachfassen darf, dass es 10 % Rabatt gibt und dass die Buchung nichts kostet.
// Er kommt mit einer Fassung vom Server; die Buchung traegt genau diese
// Fassung zurueck. Aendert sich der Text zwischen Lesen und Klick, antwortet
// die API 409 ACKNOWLEDGEMENT_OUTDATED — und der Nutzer liest neu.
export interface BookingAcknowledgement {
  version: string;
  language: string;
  body: string;
  sharedFields: string[];
  userDiscount: { pct: number; policyVersion: number } | null;
  /** Die Absaetze des Textes — die Oberflaeche zeigt je Absatz eine Zeile. */
  lines: string[];
}

export async function fetchAcknowledgement(lang: string): Promise<BookingAcknowledgement> {
  const res = await apiFetch<{ ok: boolean; version: string; language: string; body: string; shared_fields: string[]; user_discount: { pct: number; policy_version: number } | null }>(`/api/v1/acknowledgement?lang=${encodeURIComponent(lang.slice(0, 2))}`);
  return {
    version: res.version,
    language: res.language,
    body: res.body,
    sharedFields: res.shared_fields ?? [],
    userDiscount: res.user_discount ? { pct: res.user_discount.pct, policyVersion: res.user_discount.policy_version } : null,
    lines: String(res.body ?? '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
  };
}

export interface BookingConfirmation {
  booking: {
    id: string; public_ref: string; slot_start: string; slot_end: string; status: string;
    acknowledgement_version?: string; shared_fields?: string[];
    user_discount?: { pct: number; policy_version: number } | null;
  };
  // Stage-3 reveal — identity becomes visible at booking (spec §5).
  provider_identity: { name: string; website_url: string | null; contact_email: string | null };
}

export interface CreateBookingOptions {
  message?: string;
  /** Pflicht seit Phase 4 — ohne Fassung antwortet der Server 400. */
  acknowledgementVersion: string;
  language?: string;
  /** Die Sitzung, aus der die Suche kam: Bereich und Maerkte der Opportunity. */
  sessionId?: string;
}

export async function createBooking(publicRef: string, slotStart: string, opts: CreateBookingOptions): Promise<BookingConfirmation> {
  return apiFetch<BookingConfirmation & { ok: boolean }>('/api/v1/scheduling', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      public_ref: publicRef, slot_start: slotStart, message: opts.message || undefined,
      acknowledgement_version: opts.acknowledgementVersion, language: opts.language || undefined, session_id: opts.sessionId || undefined,
    }),
  });
}

/** Die Faelle, die eine Oberflaeche unterscheiden muss — alles andere ist
 *  „nicht gebucht, bitte spaeter erneut". `not_completed` ist die Belastung
 *  des Anbieters, die scheiterte (409 BOOKING_NOT_COMPLETED) oder ein
 *  Anbieter, der gerade keine Buchung annehmen kann (409 BILLING_NOT_READY):
 *  fuer den Nutzer dieselbe Lage, dieselbe neutrale Antwort, kein Grund. */
export type BookingFailure =
  | { kind: 'not_completed' }
  | { kind: 'slot_taken' }
  | { kind: 'acknowledgement_outdated'; currentVersion: string | null }
  | { kind: 'generic' };

export function bookingFailureFrom(err: unknown): BookingFailure {
  if (!(err instanceof ApiError)) return { kind: 'generic' };
  const code = String(err.body.errorCode ?? '');
  if (code === 'BOOKING_NOT_COMPLETED' || code === 'BILLING_NOT_READY') return { kind: 'not_completed' };
  if (code === 'SLOT_TAKEN') return { kind: 'slot_taken' };
  if (code === 'ACKNOWLEDGEMENT_OUTDATED') return { kind: 'acknowledgement_outdated', currentVersion: typeof err.body.current_version === 'string' ? err.body.current_version : null };
  return { kind: 'generic' };
}

// ─── Reviews (two-sided, v2 §2 of the alerts concept) ────────────────────────
export interface ReviewSubmission {
  // Pflicht seit 2026-09-22: die API nimmt nur Bewertungen aus einer
  // gehaltenen Buchung an und liest den Anbieter aus ihr, nicht aus dem Body.
  bookingId: string;
  providerKey?: string;
  fromRole: 'user' | 'provider';
  rating: number;         // 1–5
  categories: string[];
  body?: string;
}

export async function submitReview(r: ReviewSubmission): Promise<void> {
  await apiFetch('/api/v1/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking_id: r.bookingId,
      from_role: r.fromRole,
      rating: r.rating,
      categories: r.categories,
      body: r.body ?? null,
    }),
  });
}

export async function markOutcome(id: string, status: 'completed' | 'no_show'): Promise<void> {
  await apiFetch(`/api/v1/scheduling/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

// Reschedule = move the SAME lead to a new slot (no second lead fee). The
// server validates the slot is free and in the future; 409 = slot taken.
export async function rescheduleBooking(id: string, slotStart: string): Promise<{ slot_start: string; slot_end: string }> {
  return apiFetch<{ ok: boolean; slot_start: string; slot_end: string }>(`/api/v1/scheduling/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_start: slotStart }),
  });
}

export async function cancelBooking(id: string): Promise<void> {
  await apiFetch(`/api/v1/scheduling/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
}
