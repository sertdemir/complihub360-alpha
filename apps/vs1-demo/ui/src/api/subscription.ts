import { apiFetch, ApiError } from './client';
import { myProviderKey } from './provider';
import type { PlanCode } from './billing';

// ─── Tarifwahl im Anbieterportal (TKT-PROV-09 · TKT-PROV-11) ────────────────
// `GET`/`POST /api/v1/provider/:key/subscription` legt das Abo AN — genau ein
// Vorgang, der Eintritt. Wechsel und Kuendigung laufen ueber
// `POST .../subscription/schedule` und wirken zum Verlaengerungstermin
// (ADR-0006 B2/C2): sie werden vorgemerkt, nicht sofort ausgefuehrt.
//
// Es gibt KEIN Stripe-Abo: die Rechnung stellt der Monatslauf je Periode aus
// (`send_invoice`, 14 Tage). Wer hier einen Checkout im Abo-Modus einbaut,
// rechnet doppelt ab.

export type Cadence = 'monthly' | 'annual';

export interface SubscriptionPlan {
  code: PlanCode;
  label: string;
  currency: string;
  monthly_cents: number;
  annual_cents: number;
  /** `null` = keine Grenze (Global deckt alle freigegebenen Bereiche ab). */
  category_allowance: number | null;
  lead_discount_pct: number;
  lead_discount_count: number;
  /**
   * Ob das Kontingent fuer die bereits freigegebenen Hauptkategorien reicht.
   * `false` heisst: ein Wechsel darauf wird abgelehnt — die Grenze steht damit
   * VOR dem Klick, nicht erst danach als 409.
   */
  fits_released?: boolean;
}

export interface RunningSubscription {
  plan_code: PlanCode;
  cadence: Cadence;
  status: string;
  /** Der Rabattzyklus — IMMER ein Monat, auch bei jaehrlicher Zahlweise. */
  current_period_start: string;
  current_period_end: string;
  started_at: string;
  /** Die Verlaengerung — bei jaehrlicher Zahlweise ein Jahr nach dem Beginn.
   *  Bewusst getrennt vom Periodenende, siehe oben. */
  renewal_date: string | null;
}

/** Ein Bereich, fuer den der Anbieter freigegeben ist. */
export interface ReleasedCategory {
  code: string;
  label: string;
}

/**
 * Warum dieses Konto derzeit kein Abo beginnen kann. Zwei verschiedene Lagen,
 * zwei verschiedene Saetze: `suspended` ist voruebergehend und wird geprueft,
 * `terminated` ist beendet. Ein Sammelsatz wuerde das eine wie das andere
 * klingen lassen.
 */
export type IneligibleReason = 'suspended' | 'terminated';

export interface Eligibility {
  can_start: boolean;
  reason: IneligibleReason | null;
}

/**
 * Was zum Stichtag passiert. Steht NEBEN dem laufenden Abo, nicht an seiner
 * Stelle: bis dahin aendert sich nichts.
 */
export interface ScheduledChange {
  action: 'plan_change' | 'cancellation';
  plan_code: PlanCode | null;
  cadence: Cadence | null;
  /** Der Verlaengerungstermin — NICHT das Periodenende. */
  effective_on: string;
  requested_at: string;
}

export interface SubscriptionView {
  subscription: RunningSubscription | null;
  plans: SubscriptionPlan[];
  released_categories: ReleasedCategory[];
  eligibility: Eligibility;
  scheduled: ScheduledChange | null;
}

export async function fetchSubscription(providerKey?: string): Promise<SubscriptionView> {
  const key = providerKey ?? (await myProviderKey());
  const res = await apiFetch<{
    ok: boolean;
    subscription: RunningSubscription | null;
    plans: SubscriptionPlan[];
    released_categories?: ReleasedCategory[];
    eligibility?: Eligibility;
    scheduled?: ScheduledChange | null;
  }>(`/api/v1/provider/${key}/subscription`);
  return {
    subscription: res.subscription,
    plans: res.plans ?? [],
    released_categories: res.released_categories ?? [],
    scheduled: res.scheduled ?? null,
    // Ohne Angabe nicht sperren: eine aeltere API-Version darf den Anbieter
    // nicht aussperren. Die POST-Route faengt den Fall ohnehin ab.
    eligibility: res.eligibility ?? { can_start: true, reason: null },
  };
}

/**
 * Warum eine Tarifwahl nicht zustande kam. Jeder Fall hat eine eigene Flaeche
 * in der Oberflaeche — ein Sammel-"hat nicht geklappt" wuerde dem Anbieter
 * verschweigen, woran es liegt und was er tun kann.
 */
export type SelectFailure =
  /** 409 PROVIDER_NOT_ELIGIBLE — das Konto kann derzeit kein Abo beginnen. */
  | 'not-eligible'
  /** 409 SUBSCRIPTION_EXISTS — es laeuft schon eines; ein Wechsel wird vorgemerkt. */
  | 'exists'
  /** Alles andere, einschliesslich Netzfehler. */
  | 'failed';

export type SelectOutcome =
  | { ok: true; subscription: RunningSubscription }
  | { ok: false; reason: SelectFailure };

export async function selectPlan(
  planCode: PlanCode,
  cadence: Cadence,
  providerKey?: string,
): Promise<SelectOutcome> {
  const key = providerKey ?? (await myProviderKey());
  try {
    const res = await apiFetch<{ ok: boolean; subscription: RunningSubscription }>(
      `/api/v1/provider/${key}/subscription`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_code: planCode, cadence }),
      },
    );
    return { ok: true, subscription: res.subscription };
  } catch (err) {
    // Der Grund steht im Fehlerkoerper, nicht im Status: 409 traegt beide Faelle.
    const code = err instanceof ApiError ? err.body.errorCode : null;
    if (code === 'PROVIDER_NOT_ELIGIBLE') return { ok: false, reason: 'not-eligible' };
    if (code === 'SUBSCRIPTION_EXISTS') return { ok: false, reason: 'exists' };
    return { ok: false, reason: 'failed' };
  }
}

/** Der Jahrespreis sind zehn Monate (Spec B) — nie als Prozentsatz zeigen. */
export function annualMonthsPaid(): number {
  return 10;
}

// ─── Vormerken: Wechsel und Kuendigung (TKT-PROV-11 · ADR-0006 B2/C2) ───────

/**
 * Warum eine Vormerkung nicht zustande kam. Jeder Fall bekommt einen eigenen
 * Satz — besonders `allowance`: dort sind die Zahlen der Grund, und ohne sie
 * bliebe nur "geht nicht".
 */
export type ScheduleFailure =
  /** 409 ALLOWANCE_TOO_SMALL — der Zieltarif traegt weniger Hauptkategorien als freigegeben sind. */
  | { reason: 'allowance'; allowance: number; used: number }
  /** 409 ALREADY_SCHEDULED — es steht schon eine Vormerkung. */
  | { reason: 'already' }
  /** 409 SAME_PLAN — das ist der laufende Tarif. */
  | { reason: 'same' }
  /** 404 NO_SUBSCRIPTION — es laeuft gar kein Abo. */
  | { reason: 'none' }
  | { reason: 'failed' };

export type ScheduleOutcome =
  | { ok: true; scheduled: ScheduledChange | null }
  | { ok: false } & ScheduleFailure;

async function schedule(body: Record<string, unknown>, providerKey?: string): Promise<ScheduleOutcome> {
  const key = providerKey ?? (await myProviderKey());
  try {
    const res = await apiFetch<{ ok: boolean; scheduled?: ScheduledChange }>(
      `/api/v1/provider/${key}/subscription/schedule`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
    return { ok: true, scheduled: res.scheduled ?? null };
  } catch (err) {
    const b = err instanceof ApiError ? err.body : null;
    const code = b?.errorCode;
    if (code === 'ALLOWANCE_TOO_SMALL') {
      return { ok: false, reason: 'allowance', allowance: Number(b?.allowance ?? 0), used: Number(b?.used ?? 0) };
    }
    if (code === 'ALREADY_SCHEDULED') return { ok: false, reason: 'already' };
    if (code === 'SAME_PLAN') return { ok: false, reason: 'same' };
    if (code === 'NO_SUBSCRIPTION') return { ok: false, reason: 'none' };
    return { ok: false, reason: 'failed' };
  }
}

/** Merkt einen Tarifwechsel zum Verlaengerungstermin vor. */
export function scheduleChange(planCode: PlanCode, cadence: Cadence, providerKey?: string): Promise<ScheduleOutcome> {
  return schedule({ action: 'plan_change', plan_code: planCode, cadence }, providerKey);
}

/**
 * Merkt die Kuendigung zum Verlaengerungstermin vor. `reason` ist freiwillig
 * und wird nirgends erzwungen — die Kuendigung gilt auch ohne.
 */
export function scheduleCancellation(reason?: string, providerKey?: string): Promise<ScheduleOutcome> {
  return schedule({ action: 'cancellation', ...(reason ? { reason } : {}) }, providerKey);
}

/** Nimmt die Vormerkung zurueck — bis zum Stichtag jederzeit. */
export function withdrawScheduled(providerKey?: string): Promise<ScheduleOutcome> {
  return schedule({ action: 'withdraw' }, providerKey);
}
