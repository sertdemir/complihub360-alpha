import { apiFetch } from './client';

// ─── Bookings (Termine) — user side ──────────────────────────────────────────
// Matchmaking v2: the booking IS the paid lead; provider identity is revealed
// at booking time (spec §5 stage 3), so rows legitimately carry the clear name.
// GET /api/v1/bookings · PATCH /api/v1/scheduling/:id (cancel / outcome).

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface UserBooking {
  id: string;
  providerKey: string;
  providerName: string;   // clear name — identity revealed post-booking
  providerRegion: string | null;
  providerWebsite: string | null;  // affiliate 1b — post-booking reveal only
  slotStart: string;      // ISO
  slotEnd: string | null;
  status: BookingStatus;
  message: string | null;
}

interface ApiBookingRow {
  id: string;
  provider_key: string;
  provider_name: string;
  provider_region: string | null;
  provider_website: string | null;
  slot_start: string;
  slot_end: string | null;
  status: BookingStatus;
  message: string | null;
}

// Affiliate 1b: the counted outclick URL to a provider's website. The server
// verifies the caller has booked this provider, logs the click and 302-
// redirects — so this is a plain <a href>, not an apiFetch.
export function providerWebsiteHref(providerKey: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) || '';
  return `${base}/api/v1/provider/${providerKey}/website`;
}

export async function fetchUserBookings(): Promise<UserBooking[]> {
  const res = await apiFetch<{ ok: boolean; bookings: ApiBookingRow[] }>('/api/v1/bookings');
  return (res.bookings || []).map((b) => ({
    id: b.id,
    providerKey: b.provider_key,
    providerName: b.provider_name,
    providerRegion: b.provider_region,
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
  message: string | null;
}

export async function fetchProviderBookings(providerKey: string): Promise<ProviderBooking[]> {
  const res = await apiFetch<{ ok: boolean; bookings: Array<{ id: string; slot_start: string; slot_end: string | null; status: BookingStatus; lead_charged: boolean; user_email: string | null; message: string | null }> }>(`/api/v1/provider/${providerKey}/bookings`);
  return (res.bookings || []).map((b) => ({
    id: b.id,
    slotStart: b.slot_start,
    slotEnd: b.slot_end,
    status: b.status,
    leadCharged: b.lead_charged,
    userEmail: b.user_email,
    message: b.message,
  }));
}

// ─── Stage-2 detail + native scheduling (Phase-3 wiring) ─────────────────────
// GET /provider/:key/detail — the monetised, still-anonymous detail payload
// (fires provider_detail_opened server-side, deduped 1×/user/30d).
export interface ProviderDetail {
  provider_key: string;
  pseudonym_label: string;
  region: string | null;
  active_since: number | null;
  specializations: string[];
  languages: string[];
  countries_supported: string[];
  rating: number | null;
  completed_count: number | null;
  avg_response_hours: number | null;
  billing_model: 'abo' | 'hourly' | 'project' | 'mixed';
  pricing_table: Array<{ service: string; price: string }> | null;
  is_verified: boolean;
  availability: 'available' | 'ooo';
}

export async function fetchProviderDetail(key: string): Promise<ProviderDetail> {
  const res = await apiFetch<{ ok: boolean; detail: ProviderDetail }>(`/api/v1/provider/${key}/detail`);
  return res.detail;
}

export async function fetchSlots(key: string): Promise<string[]> {
  const res = await apiFetch<{ ok: boolean; slots: string[] }>(`/api/v1/provider/${key}/slots`);
  return res.slots || [];
}

export interface BookingConfirmation {
  booking: { id: string; provider_key: string; slot_start: string; slot_end: string; status: string };
  // Stage-3 reveal — identity becomes visible at booking (spec §5).
  provider_identity: { name: string; website_url: string | null; contact_email: string | null };
}

export async function createBooking(providerKey: string, slotStart: string, message?: string): Promise<BookingConfirmation> {
  return apiFetch<BookingConfirmation & { ok: boolean }>('/api/v1/scheduling', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_key: providerKey, slot_start: slotStart, message: message || undefined }),
  });
}

// ─── Reviews (two-sided, v2 §2 of the alerts concept) ────────────────────────
export interface ReviewSubmission {
  bookingId?: string;
  providerKey: string;
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
      booking_id: r.bookingId ?? null,
      provider_key: r.providerKey,
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
