import { apiFetch } from './client';
import type { RequestStatus } from '../components/ui/RequestCard';

// ─── Requests API ─────────────────────────────────────────────────────────────
// GET /api/v1/requests (compliance-api) → provider request inbox. Maps the raw
// engagement_requests rows onto the shape the RequestCard pages consume.

export interface EngagementRow {
  id: string;
  provider_key: string;
  country?: string;
  category?: string;
  message?: string;
  structured_answers?: { company?: string; requester_email?: string } & Record<string, unknown>;
  status: 'created' | 'delivered' | 'confirmed' | 'replied' | 'declined' | 'expired' | string;
  sla_confirm_deadline?: string;
  sla_reply_deadline?: string;
  created_at: string;
}

export interface ProviderRequest {
  id: string;
  /** Kurz-ID "RQ-7C41" — steht am Ende der Kontextzeile (1 V3). */
  ref: string;
  /** Rohwerte; Bereich, Markt und Eingang uebersetzt das UI (lib/requestContext). */
  category?: string;
  country?: string;
  status: RequestStatus;
  statusLabel: string;
  company: string;
  meta: string;
  sla?: string;
  createdAt?: string; // raw ISO — Kontextzeile + C1 new-since-last-seen banner
  action: { label: string; variant: 'primary' | 'primary' | 'ghost' };
}

// Engagement lifecycle → RequestCard status axis.
const STATUS_MAP: Record<string, { status: RequestStatus; label: string; action: ProviderRequest['action'] }> = {
  created: { status: 'awaiting-confirm', label: 'Awaiting confirm', action: { label: 'Open · confirm', variant: 'primary' } },
  delivered: { status: 'awaiting-confirm', label: 'Awaiting confirm', action: { label: 'Open · confirm', variant: 'primary' } },
  viewed: { status: 'awaiting-confirm', label: 'Awaiting confirm', action: { label: 'Open · confirm', variant: 'primary' } },
  confirmed: { status: 'awaiting-reply', label: 'Awaiting reply', action: { label: 'Reply', variant: 'primary' } },
  replied: { status: 'active', label: 'Active', action: { label: 'View', variant: 'ghost' } },
};

// Dossier rule (Addendum 2026-07-10): the requester identity unlocks only
// after the provider confirms — before that the card stays anonymized.
const UNLOCKED_STATUSES = new Set(['confirmed', 'replied']);

function slaLeft(iso?: string): string | undefined {
  if (!iso) return undefined;
  const left = new Date(iso).getTime() - Date.now();
  if (left <= 0) return 'overdue';
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export async function fetchProviderRequests(): Promise<ProviderRequest[]> {
  const { requests } = await apiFetch<{ ok: boolean; requests: EngagementRow[] }>('/api/v1/requests');
  return requests
    .filter((r) => r.status in STATUS_MAP)
    .map((r) => {
      const m = STATUS_MAP[r.status];
      return {
        id: r.id,
        ref: `RQ-${r.id.slice(0, 4).toUpperCase()}`,
        category: r.category,
        country: r.country,
        status: m.status,
        statusLabel: m.label,
        company: UNLOCKED_STATUSES.has(r.status)
          ? r.structured_answers?.company ?? 'Requester'
          : '🔒 Anonymized · unlocks on confirm',
        meta: r.message || '',
        sla: m.status === 'active' ? undefined : slaLeft(r.status === 'confirmed' ? r.sla_reply_deadline : r.sla_confirm_deadline),
        createdAt: r.created_at,
        action: m.action,
      };
    });
}

// ─── User-side view of the same engagement rows (wiring map B11) ─────────────
export interface UserRequestRow {
  uuid: string;
  id: string;               // display line
  status: RequestStatus;
  statusLabel: string;
  company: string;
  partner?: boolean;
  meta: string;
  action: { label: string; variant: 'primary' | 'secondary' };
  bucket: 'confirm' | 'confirmed' | 'replied' | 'overdue' | 'active' | 'closed';
  /** Raw engagement status — the B14 actions drawer gates remind/withdraw on it. */
  rawStatus?: string;
  /** Rohwerte fuer die Anzeige (4B): Zeitpunkte lokalisiert das UI selbst,
   *  Bereich/Markt werden dort uebersetzt statt als Slug gezeigt. */
  createdAt?: string;
  category?: string;
  country?: string;
  /** Der angefragte Anbieter — daran haengt das Dashboard einem Termin sein
   *  Thema an (Buchungen tragen weder Bereich noch Markt). */
  providerKey?: string;
  /** Die gerade laufende Frist (confirm 24h / reply 48h) — null, wenn keine läuft. */
  slaDeadline?: string | null;
  slaWindowMs?: number;
}

const USER_VIEW: Record<string, Pick<UserRequestRow, 'status' | 'statusLabel' | 'action' | 'bucket'>> = {
  created:   { status: 'awaiting-confirm', statusLabel: 'Awaiting confirmation', action: { label: 'Send reminder', variant: 'primary' }, bucket: 'confirm' },
  delivered: { status: 'awaiting-confirm', statusLabel: 'Awaiting confirmation', action: { label: 'Send reminder', variant: 'primary' }, bucket: 'confirm' },
  viewed:    { status: 'awaiting-confirm', statusLabel: 'Awaiting confirmation', action: { label: 'Send reminder', variant: 'primary' }, bucket: 'confirm' },
  confirmed: { status: 'active', statusLabel: 'Provider confirmed', action: { label: 'View thread', variant: 'secondary' }, bucket: 'confirmed' },
  replied:   { status: 'awaiting-reply', statusLabel: 'Provider replied', action: { label: 'Open thread', variant: 'secondary' }, bucket: 'replied' },
  // Matrix-Befund 7 (2026-09-05): eine Ablehnung ist abgeschlossen, nicht
  // "wartet auf Sie" — und traegt die neutrale Pille, nicht die aktive.
  declined:  { status: 'closed', statusLabel: 'Declined', action: { label: 'View request', variant: 'secondary' }, bucket: 'closed' },
  expired:   { status: 'awaiting-confirm', statusLabel: 'Expired', action: { label: 'View request', variant: 'secondary' }, bucket: 'overdue' },
  withdrawn: { status: 'closed', statusLabel: 'Withdrawn', action: { label: 'View thread', variant: 'secondary' }, bucket: 'closed' },
};

// v2 §5 anonymity: pre-booking the user only ever sees an anonymous
// "Verified <type> · <region>" label — the provider identity reveals only
// after a booking (post-booking views may show clear names).
//
// The English label is the canonical value (search, fallback); the screen
// shows userws:requests.anonProvider.<key> via anonProviderLabel(). Until
// 2026-10-07 these were German literals and read German in every language.
export const PROVIDER_NAMES: Record<string, string> = {
  'studio-bianchi': 'Verified tax firm · Northern Italy',
  'schmidt-partner': 'Verified tax advisory · Northern Germany',
  'madrid-tax': 'Verified tax specialist · Spain',
  'dahlmann-cpa': 'Verified tax expert · USA',
  'thames-vat': 'Verified VAT specialist · United Kingdom',
  'costa-legal': 'Verified law firm · Spain',
  'datenschutz-nord': 'Verified data protection firm · Northern Germany',
  'oss-experts': 'Verified tax advisory · Berlin',
  'lucid-reg': 'Verified EPR service provider · Hamburg',
};

/** The anonymous provider label in the reader's language. `t` must be bound
 *  to the userws namespace. Unknown keys fall back to the canonical label. */
export function anonProviderLabel(
  t: (key: string, opts: { defaultValue: string }) => string,
  r: { providerKey?: string; company: string },
): string {
  return r.providerKey && PROVIDER_NAMES[r.providerKey]
    ? t(`requests.anonProvider.${r.providerKey}`, { defaultValue: r.company })
    : r.company;
}

export async function fetchUserRequests(): Promise<UserRequestRow[]> {
  const { requests } = await apiFetch<{ ok: boolean; requests: EngagementRow[] }>('/api/v1/requests');
  return requests.map((r) => {
    const v = USER_VIEW[r.status] ?? USER_VIEW.created;
    // Welche Frist laeuft? Vor der Bestaetigung die 24h-Confirm-Frist, nach ihr
    // die 48h-Reply-Frist. Beantwortet/abgeschlossen laeuft nichts mehr.
    const slaDeadline = v.bucket === 'confirm' || v.bucket === 'overdue'
      ? r.sla_confirm_deadline ?? null
      : v.bucket === 'confirmed' ? r.sla_reply_deadline ?? null : null;
    return {
      uuid: r.id,
      id: `RQ-${r.id.slice(0, 4).toUpperCase()}`,
      status: v.status,
      statusLabel: v.statusLabel,
      company: PROVIDER_NAMES[r.provider_key] ?? r.provider_key,
      partner: true,
      meta: `${r.category} · ${r.country}`,
      action: v.action,
      bucket: v.bucket,
      rawStatus: r.status,
      createdAt: r.created_at,
      category: r.category,
      country: r.country,
      providerKey: r.provider_key,
      slaDeadline,
      slaWindowMs: v.bucket === 'confirmed' ? 48 * 3_600_000 : 24 * 3_600_000,
    };
  });
}
