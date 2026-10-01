import { myProviderKey } from './provider';
import { apiFetch } from './client';
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
  /** 3 V3: Bereichscodes der Beschreibung — das UI uebersetzt sie. */
  providerAreaCodes: string[];
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
  provider_area_codes?: string[];
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
    providerAreaCodes: b.provider_area_codes ?? [],
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
export interface ProviderBooking {
  id: string;
  slotStart: string;
  slotEnd: string | null;
  status: BookingStatus;
  leadCharged: boolean;
  userEmail: string | null;  // dossier: identity delivered at booking
  /** Firma aus der Anfrage an diesen Anbieter (2 V1) — null ohne Angabe. */
  userCompany: string | null;
  /** Thema der Anfrage, roh (das UI uebersetzt). */
  category: string | null;
  country: string | null;
  message: string | null;
}

export async function fetchProviderBookings(providerKey?: string): Promise<ProviderBooking[]> {
  const key = providerKey ?? await myProviderKey();
  const res = await apiFetch<{ ok: boolean; bookings: Array<{ id: string; slot_start: string; slot_end: string | null; status: BookingStatus; lead_charged: boolean; user_email: string | null; user_company?: string | null; category?: string | null; country?: string | null; message: string | null }> }>(`/api/v1/provider/${key}/bookings`);
  return (res.bookings || []).map((b) => ({
    id: b.id,
    slotStart: b.slot_start,
    slotEnd: b.slot_end,
    status: b.status,
    leadCharged: b.lead_charged,
    userEmail: b.user_email,
    userCompany: b.user_company ?? null,
    category: b.category ?? null,
    country: b.country ?? null,
    message: b.message,
  }));
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
  /** 3 V3: Bereichscodes + Region, damit das UI uebersetzt. */
  area_codes?: string[];
  descriptor_region?: string | null;
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
  /** false = es kann nicht gebucht werden; die Seite zeigt dann keinen Knopf
   *  (Nutzer-Entscheidung 2026-10-01). Wird aus dem laufenden Tarif berechnet. */
  bookable_chargeable?: boolean;
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

export interface BookingConfirmation {
  booking: { id: string; public_ref: string; slot_start: string; slot_end: string; status: string };
  // Stage-3 reveal — identity becomes visible at booking (spec §5).
  provider_identity: { name: string; website_url: string | null; contact_email: string | null };
}

export async function createBooking(publicRef: string, slotStart: string, message?: string): Promise<BookingConfirmation> {
  return apiFetch<BookingConfirmation & { ok: boolean }>('/api/v1/scheduling', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_ref: publicRef, slot_start: slotStart, message: message || undefined }),
  });
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
