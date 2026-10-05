import { apiFetch, ApiError } from './client';
import { myProviderKey } from './provider';
import type { PlanCode } from './billing';

// ─── Tarifwahl im Anbieterportal (TKT-PROV-09) ───────────────────────────────
// `GET`/`POST /api/v1/provider/:key/subscription` aus #240. Genau ein Vorgang:
// das erste Abo beginnen. Wechsel und Kuendigung gehen hier NICHT — die Regeln
// dafuer (anteilige Abrechnung, Kuendigungsfrist, Reaktivierung) hat Spec B
// ausdruecklich offen gelassen, und der Server antwortet entsprechend mit 409.
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

export interface SubscriptionView {
  subscription: RunningSubscription | null;
  plans: SubscriptionPlan[];
  released_categories: ReleasedCategory[];
  eligibility: Eligibility;
}

export async function fetchSubscription(providerKey?: string): Promise<SubscriptionView> {
  const key = providerKey ?? (await myProviderKey());
  const res = await apiFetch<{
    ok: boolean;
    subscription: RunningSubscription | null;
    plans: SubscriptionPlan[];
    released_categories?: ReleasedCategory[];
    eligibility?: Eligibility;
  }>(`/api/v1/provider/${key}/subscription`);
  return {
    subscription: res.subscription,
    plans: res.plans ?? [],
    released_categories: res.released_categories ?? [],
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
  /** 409 SUBSCRIPTION_EXISTS — es laeuft schon eines; Wechsel gibt es hier nicht. */
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
