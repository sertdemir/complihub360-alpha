// ─── Ein Abo entsteht hier — und nur hier ────────────────────────────────────
//
// `provider_subscriptions` (Migration 20260923000000) hatte bis zum 2026-10-01
// KEINEN Schreiber. Kein Checkout, keine Admin-Zuweisung, kein Weiterrollen der
// Periode. Weil `billingReadiness` ein laufendes Abo verlangt, war damit
// niemand buchbar — das Datenmodell war vollstaendig, der Weg hinein fehlte.
//
// Wie das Geld laeuft, ist dabei schon entschieden und steht NICHT hier: der
// Monatslauf (`handleBillingRun`, billing.ts) stellt je Periode eine
// Stripe-RECHNUNG aus (`send_invoice`, 14 Tage Zahlungsziel). Es gibt kein
// Stripe-Abo-Objekt. Ein Stripe-Checkout im Abo-Modus waere deshalb eine ZWEITE
// Abrechnung und wuerde doppelt belasten. Dieses Modul schreibt darum nur den
// Datensatz; die Rechnung stellt weiter der Lauf.
//
// Spec B fuehrte unter "Configurable items requiring final decision":
// *"Subscription proration, cancellation notice, grace period, failed-payment
// retry, and reactivation rules."* Drei davon sind seit dem 2026-10-07
// entschieden (ADR-0006, Wahl A2/B2/C2) und hier umgesetzt:
//
//   - **Tarifwechsel** wird VORGEMERKT und wirkt zum Verlaengerungstermin.
//     Keine anteilige Abrechnung — die Pro-rata-Frage ist damit nicht
//     beantwortet, sondern umgangen: es faellt nichts an, was zu teilen waere.
//   - **Kuendigung** loest der Anbieter selbst aus, das Abo laeuft bis zum
//     Stichtag, bis dahin ruecknehmbar. Keine Erstattung.
//   - Die **Kulanzfrist** steht in billing.ts (`overdueState`).
//
// Weiterhin offen und deshalb hier NICHT erfunden: `failed-payment retry` und
// `reactivation rules`.
//
// Und was hier erst recht nicht passiert: das Abo beruehrt das Matching nicht.
// Spec A §14, Spec B "Ranking benefit: Never".

import type { IncomingMessage, ServerResponse } from "http";
import { supabaseApi } from "./supabase.js";
import { structuredLog } from "@complihub360/types";
import { categoryAllowanceCheck, getActiveSubscription, loadPricingConfig, type Subscription } from "./billing.js";
import { syncBillingReadiness } from "./leadCharge.js";
import { reviewLog } from "./providerApplication.js";
import { notify } from "./notifications.js";
import type { Caller } from "./providerAuth.js";

export type Cadence = 'monthly' | 'annual';
export type SubscriptionSource = 'provider_self_serve' | 'admin';

const CADENCES: Cadence[] = ['monthly', 'annual'];

// ─── Datums-Mathematik, rein und ohne Netz pruefbar ──────────────────────────

/**
 * Verschiebt ein Datum um Monate. Laeuft der Tag im Zielmonat nicht auf
 * (31. Januar + 1 Monat), wird auf den letzten Tag des Zielmonats gekuerzt —
 * sonst spraenge der 31.01. auf den 03.03.
 */
export function addMonths(dateIso: string, months: number): string {
    const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number);
    const target = m - 1 + months;
    const ty = y + Math.floor(target / 12);
    const tm = ((target % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    const td = Math.min(d, lastDay);
    return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(td).padStart(2, '0')}`;
}

/**
 * Das Ende des Zyklus, der am `start` beginnt — IMMER ein Monat, auch bei
 * jaehrlicher Zahlweise.
 *
 * `current_period_*` ist der **Monatszyklus**, nicht die Abo-Laufzeit. Spec B:
 * *"The counter resets on the monthly billing-cycle date and does not roll
 * over."* Darum nennt Spec B in den Backend-Anforderungen die **renewal date**
 * als eigenes Feld, und darum hat die Tabelle beides: `current_period_*` fuer
 * den Zyklus, `renewal_date` fuer die Verlaengerung.
 *
 * Waere der Zyklus bei einem Jahresabo ein Jahr lang, bekaeme der Anbieter
 * seine 3 bzw. 6 rabattierten Leads einmal im JAHR statt im Monat — zu seinen
 * Lasten. Genau das hatte ich hier zuerst gebaut.
 */
export function cycleEndFor(startIso: string): string {
    return addMonths(startIso, 1);
}

/**
 * Der naechste Verlaengerungstermin, gerechnet vom Beginn des Abos: beim
 * Jahresabo der naechste Jahrestag, beim Monatsabo der naechste Monatstag.
 *
 * Vom Beginn aus gerechnet und nicht fortgeschrieben, damit der Termin auch
 * nach einer Luecke im Watcher-Lauf stimmt und der Tag nicht durch
 * wiederholtes Kuerzen nach vorne wandert.
 *
 * Spec B: "Annual subscriptions charge ten months of the applicable monthly
 * price and provide twelve months of access." Die zehn Monate stehen im Preis
 * (`plan_catalog.annual_cents`), die zwoelf Monate hier.
 */
export function renewalAfter(startedOn: string, cadence: Cadence, today: string): string {
    const step = cadence === 'annual' ? 12 : 1;
    const from = startedOn.slice(0, 10);
    for (let k = 1; k <= 400; k++) {
        const d = addMonths(from, step * k);
        if (d > today) return d;
    }
    // Deckel erreicht: ueber 33 Jahre alt. Dann lieber der naechste Schritt ab
    // heute als eine Zahl, die in der Vergangenheit liegt.
    return addMonths(today, step);
}

/**
 * Wie weit der Zyklus zu rollen ist, damit `today` wieder in ihm liegt — in
 * Monatsschritten, unabhaengig von der Zahlweise. Rein, damit auch der Fall
 * "mehrere Zyklen verpasst" pruefbar ist, ohne die Uhr zu stellen. Null
 * bedeutet: der Zyklus ist aktuell.
 */
export function rollCycle(
    start: string, end: string, today: string,
): { start: string; end: string } | null {
    let s = start.slice(0, 10), e = end.slice(0, 10);
    if (today < e) return null;
    // Deckel: 400 Monatsschritte sind ueber 33 Jahre — eine Zeile, die so alt
    // ist, ist ein Datenfehler und kein Zyklus, den man nachrollt.
    for (let i = 0; i < 400 && today >= e; i++) {
        s = e;
        e = cycleEndFor(e);
    }
    return today < e ? { start: s, end: e } : null;
}

// ─── Lesen ───────────────────────────────────────────────────────────────────

async function openRow(providerKey: string): Promise<any | null> {
    const rows = (await supabaseApi.select('provider_subscriptions', { provider_key: providerKey },
        { order: 'started_at.desc', limit: 10 })) as any[];
    return rows.find((r) => !r.ended_at) ?? null;
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

// ─── Schreiben ───────────────────────────────────────────────────────────────

export type StartFailure =
    | 'PROVIDER_NOT_FOUND' | 'UNKNOWN_PLAN' | 'INVALID_CADENCE' | 'SUBSCRIPTION_EXISTS'
    | 'PROVIDER_NOT_ELIGIBLE';

/**
 * Konten, die kein Abo beginnen duerfen. `terminated` heisst: die Beziehung ist
 * beendet. `suspended` heisst: Vorfall oder Untersuchung. In beiden Faellen
 * koennte der Anbieter nicht vermittelt werden — ein bezahlter Tarif waere Geld
 * fuer nichts. *"Businesses should not pay for services they do not need."*
 *
 * Gilt auch fuer die Admin-Zuweisung: wer hier ein Abo braucht, aendert zuerst
 * den Lebenszyklus, und das ist selbst protokolliert. Eine stille Ausnahme fuer
 * Admins waere der bequemere, aber schlechtere Weg.
 *
 * `draft` und `submitted` bleiben ausdruecklich erlaubt: Abrechnung und
 * Aktivierung sind zwei Achsen (TKT-PROV-05). Billing sperrt das Aktivieren
 * nicht — und das Aktivieren sperrt dann auch nicht die Abrechnung.
 * `paused` bleibt erlaubt: wer voruebergehend nicht verfuegbar ist, will
 * seinen Tarif oft behalten.
 */
const NOT_ELIGIBLE = new Set(['terminated', 'suspended']);

export interface StartInput {
    providerKey: string;
    planCode: string;
    cadence: Cadence;
    source: SubscriptionSource;
    actorId?: string | null;
}

/**
 * Legt das erste bzw. naechste Abo an. Verweigert, solange ein nicht beendetes
 * Abo besteht — der Partial Unique Index `provider_subscriptions_one_open`
 * sagt dasselbe, aber als Fehlermeldung statt als Datenbankabsturz.
 *
 * Ein WECHSEL laeuft nicht hierueber, sondern ueber
 * `scheduleSubscriptionChange`: er wird vorgemerkt und zum
 * Verlaengerungstermin ausgefuehrt (ADR-0006 B2). Diese Funktion bleibt der
 * Eintritt — das erste Abo, und das naechste nach einem beendeten.
 */
export async function startSubscription(
    i: StartInput,
): Promise<{ ok: true; subscription: Subscription } | { ok: false; code: StartFailure }> {
    if (!CADENCES.includes(i.cadence)) return { ok: false, code: 'INVALID_CADENCE' };

    const prov = (await supabaseApi.select('providers', { provider_key: i.providerKey }, { limit: 1 })) as any[];
    if (!prov[0]) return { ok: false, code: 'PROVIDER_NOT_FOUND' };
    if (NOT_ELIGIBLE.has(String(prov[0].lifecycle_status))) return { ok: false, code: 'PROVIDER_NOT_ELIGIBLE' };

    const cfg = await loadPricingConfig();
    const plan = cfg.plans.find((p) => p.code === i.planCode);
    if (!plan) return { ok: false, code: 'UNKNOWN_PLAN' };

    if (await openRow(i.providerKey)) return { ok: false, code: 'SUBSCRIPTION_EXISTS' };

    const start = today();
    // Zwei verschiedene Termine: der Zyklus ist immer ein Monat (daran haengt
    // der Rabattzaehler), die Verlaengerung richtet sich nach der Zahlweise.
    const end = cycleEndFor(start);
    const renewal = renewalAfter(start, i.cadence, start);
    const inserted = await supabaseApi.insert('provider_subscriptions', {
        provider_key: i.providerKey,
        plan_code: plan.code,
        plan_version: plan.version ?? 1,
        cadence: i.cadence,
        status: 'active',
        current_period_start: start,
        current_period_end: end,
        renewal_date: renewal,
        source: i.source,
    });
    const row = Array.isArray(inserted) ? inserted[0] : inserted;

    await reviewLog({
        providerKey: i.providerKey, subject: 'subscription', subjectId: row?.id ?? null,
        action: 'subscription_started', from: null, to: `${plan.code}/${i.cadence}`,
        reason: i.source === 'admin' ? 'administrative assignment' : null,
        actorId: i.actorId ?? null, actorKind: i.source === 'admin' ? 'reviewer' : 'provider',
    });
    await supabaseApi.insert('event_log', {
        type: 'provider_subscription_started',
        payload: { providerKey: i.providerKey, plan: plan.code, cadence: i.cadence, source: i.source },
    }).catch(() => { /* Protokoll ist Beiwerk */ });

    // Buchbarkeit haengt am Abo (eine von sieben Bedingungen). Ohne diesen
    // Anstoss bliebe `billing_ready` stehen, bis der Watcher laeuft.
    await syncBillingReadiness(i.providerKey).catch(() => null);

    return {
        ok: true,
        subscription: {
            id: String(row?.id ?? ''), providerKey: i.providerKey, planCode: plan.code as Subscription['planCode'],
            planVersion: plan.version ?? 1, cadence: i.cadence, status: 'active',
            currentPeriodStart: start, currentPeriodEnd: end, startedAt: String(row?.started_at ?? new Date().toISOString()),
            renewalDate: renewal,
        },
    };
}

/**
 * Beendet das laufende Abo. `status = 'ended'` zusammen mit `ended_at` — die
 * Tabelle verlangt das so (`CHECK (ended_at IS NULL OR status = 'ended')`), und
 * erst damit ist der Platz fuer ein neues Abo frei.
 *
 * Kein Geld bewegt sich hier: keine Erstattung, keine Pro rata. Die Periode,
 * die schon in Rechnung steht, bleibt in Rechnung.
 *
 * Das ist der SOFORTIGE Weg und bleibt der Admin-Weg. Die Selbstkuendigung des
 * Anbieters laeuft ueber `scheduleSubscriptionCancellation` und wirkt erst zum
 * Verlaengerungstermin (ADR-0006 C2) — wer hier landet, hat einen Grund dafuer.
 * `reactivation rules` sind weiterhin unentschieden.
 */
export async function endSubscription(
    i: { providerKey: string; reason?: string | null; actorId?: string | null; source: SubscriptionSource },
): Promise<{ ok: true; endedPlan: string } | { ok: false; code: 'NO_SUBSCRIPTION' }> {
    const row = await openRow(i.providerKey);
    if (!row) return { ok: false, code: 'NO_SUBSCRIPTION' };
    await supabaseApi.update('provider_subscriptions', { id: row.id }, {
        status: 'ended', ended_at: new Date().toISOString(),
    });
    await reviewLog({
        providerKey: i.providerKey, subject: 'subscription', subjectId: String(row.id),
        action: 'subscription_ended', from: `${row.plan_code}/${row.cadence}`, to: 'ended',
        reason: i.reason ?? null, actorId: i.actorId ?? null,
        actorKind: i.source === 'admin' ? 'reviewer' : 'provider',
    });
    await supabaseApi.insert('event_log', {
        type: 'provider_subscription_ended',
        payload: { providerKey: i.providerKey, plan: row.plan_code, source: i.source },
    }).catch(() => { /* Protokoll ist Beiwerk */ });
    await syncBillingReadiness(i.providerKey).catch(() => null);
    return { ok: true, endedPlan: String(row.plan_code) };
}

// ─── Vormerken: Wechsel und Kuendigung zum Verlaengerungstermin ─────────────
//
// ADR-0006, Wahl B2 und C2 (Nutzer, 2026-10-07). Beides wirkt zum Stichtag,
// nicht sofort: bis dahin laeuft das Abo unveraendert weiter, und die
// Vormerkung bleibt ruecknehmbar. Keine anteilige Abrechnung, keine Erstattung.

/**
 * Die Logins des Anbieters. Eine Abo-Nachricht geht an alle Mitglieder: wer
 * das Konto fuehrt, soll von einer Kuendigung erfahren, auch wenn ein anderer
 * sie ausgeloest hat. `notify` laesst den Ausloeser selbst aus (Regel 1).
 */
async function mitgliederVon(providerKey: string): Promise<string[]> {
    const rows = (await supabaseApi.select('provider_members', { provider_key: providerKey }, { limit: 20 })
        .catch(() => [])) as Array<{ user_id: string }>;
    return rows.map((r) => r.user_id).filter(Boolean);
}

/** Benachrichtigt alle Mitglieder; schlaegt nie nach aussen durch. */
async function sagAllen(providerKey: string, actor: string | null | undefined, args: Omit<Parameters<typeof notify>[0], 'to' | 'actor'>): Promise<void> {
    for (const to of await mitgliederVon(providerKey)) {
        await notify({ ...args, to, actor: actor ?? null }).catch(() => null);
    }
}

export type ScheduleAction = 'plan_change' | 'cancellation';

export interface ScheduledChange {
    action: ScheduleAction;
    planCode: string | null;
    cadence: Cadence | null;
    effectiveOn: string;
    requestedAt: string;
}

export type ScheduleFailure =
    | 'NO_SUBSCRIPTION' | 'UNKNOWN_PLAN' | 'INVALID_CADENCE'
    | 'SAME_PLAN' | 'ALREADY_SCHEDULED' | 'ALLOWANCE_TOO_SMALL';

/** Liest den vorgemerkten Zustand aus einer Abo-Zeile; `null` heisst: nichts vorgemerkt. */
export function scheduledOf(row: any): ScheduledChange | null {
    if (!row?.scheduled_action || !row.scheduled_effective_on) return null;
    return {
        action: row.scheduled_action === 'cancellation' ? 'cancellation' : 'plan_change',
        planCode: row.scheduled_plan_code ?? null,
        cadence: row.scheduled_cadence === 'annual' ? 'annual' : row.scheduled_cadence === 'monthly' ? 'monthly' : null,
        effectiveOn: String(row.scheduled_effective_on).slice(0, 10),
        requestedAt: String(row.scheduled_requested_at ?? ''),
    };
}

/**
 * Der Stichtag einer Vormerkung: der Verlaengerungstermin.
 *
 * **`renewal_date`, nicht `current_period_end`.** Die beiden sind nur bei
 * monatlicher Zahlweise dasselbe; bei jaehrlicher liegen bis zu elf
 * Monatszyklen dazwischen. Wer sie verwechselt, beendet ein bezahltes
 * Jahresabo nach vier Wochen.
 *
 * Steht in der Zeile kein Termin oder einer in der Vergangenheit (der
 * Waechter-Lauf hinkt hinterher, `renewal_date` ist ausserdem nullable), wird
 * er vom Abo-Beginn neu gerechnet. Ein Stichtag, der schon vorbei ist, waere
 * eine Vormerkung, die beim naechsten Lauf sofort zuschlaegt — und der
 * Anbieter haette nie eine Frist gehabt.
 */
export function effectiveDateFor(row: any, heute: string): string {
    const renewal = row?.renewal_date ? String(row.renewal_date).slice(0, 10) : null;
    if (renewal && renewal > heute) return renewal;
    const cadence: Cadence = row?.cadence === 'annual' ? 'annual' : 'monthly';
    return renewalAfter(String(row?.started_at ?? heute), cadence, heute);
}

export interface ScheduleChangeInput {
    providerKey: string;
    planCode: string;
    cadence: Cadence;
    source: SubscriptionSource;
    actorId?: string | null;
}

/**
 * Merkt einen Tarifwechsel zum Stichtag vor.
 *
 * **Ein Downgrade unter die genutzten Hauptkategorien wird abgelehnt, nicht
 * vorgemerkt.** `categoryAllowanceCheck` fliesst ueber `verificationRules` in
 * `missing` ein: Wuerde der kleinere Tarif am Stichtag greifen, waere der
 * Anbieter nicht mehr aktivierbar — still, Monate nach dem Klick, und ohne
 * dass jemand den Zusammenhang sieht. Lieber jetzt ein konkreter Grund als
 * spaeter eine unerklaerliche Deaktivierung.
 */
export async function scheduleSubscriptionChange(
    i: ScheduleChangeInput,
): Promise<{ ok: true; scheduled: ScheduledChange } | { ok: false; code: ScheduleFailure; allowance?: number; used?: number }> {
    if (!CADENCES.includes(i.cadence)) return { ok: false, code: 'INVALID_CADENCE' };

    const row = await openRow(i.providerKey);
    if (!row) return { ok: false, code: 'NO_SUBSCRIPTION' };
    if (scheduledOf(row)) return { ok: false, code: 'ALREADY_SCHEDULED' };

    const cfg = await loadPricingConfig();
    const plan = cfg.plans.find((p) => p.code === i.planCode);
    if (!plan) return { ok: false, code: 'UNKNOWN_PLAN' };
    if (plan.code === row.plan_code && i.cadence === row.cadence) return { ok: false, code: 'SAME_PLAN' };

    const areas = await releasedAreasOf(i.providerKey);
    const fit = categoryAllowanceCheck(plan, areas.map((a) => a.code));
    if (!fit.ok) return { ok: false, code: 'ALLOWANCE_TOO_SMALL', allowance: fit.allowance ?? 0, used: fit.used };

    const heute = today();
    const effective = effectiveDateFor(row, heute);
    const requestedAt = new Date().toISOString();
    await supabaseApi.update('provider_subscriptions', { id: row.id }, {
        scheduled_action: 'plan_change',
        scheduled_plan_code: plan.code,
        scheduled_plan_version: plan.version ?? 1,
        scheduled_cadence: i.cadence,
        scheduled_effective_on: effective,
        scheduled_requested_at: requestedAt,
    });
    await reviewLog({
        providerKey: i.providerKey, subject: 'subscription', subjectId: String(row.id),
        action: 'subscription_change_scheduled',
        from: `${row.plan_code}/${row.cadence}`, to: `${plan.code}/${i.cadence}`,
        reason: `effective ${effective}`, actorId: i.actorId ?? null,
        actorKind: i.source === 'admin' ? 'reviewer' : 'provider',
    });
    await supabaseApi.insert('event_log', {
        type: 'provider_subscription_change_scheduled',
        payload: { providerKey: i.providerKey, from: row.plan_code, to: plan.code, cadence: i.cadence, effectiveOn: effective },
    }).catch(() => { /* Protokoll ist Beiwerk */ });
    await sagAllen(i.providerKey, i.actorId, {
        type: 'subscription_scheduled', subject: 'provider', subjectId: i.providerKey,
        payload: { providerKey: i.providerKey, from: row.plan_code, to: plan.code, label: i.cadence, effectiveOn: effective },
    });

    return { ok: true, scheduled: { action: 'plan_change', planCode: plan.code, cadence: i.cadence, effectiveOn: effective, requestedAt } };
}

/**
 * Merkt die Kuendigung zum Stichtag vor. Das Abo laeuft bis dahin vollstaendig
 * weiter — Buchbarkeit, Abrechnung, alles.
 *
 * **`status` wird NICHT auf 'cancelled' gesetzt.** Im Code ist der Status eine
 * Aussage ueber das Jetzt: `billingReadiness` setzt bei 'cancelled' den Grund
 * `inactive_subscription`, `subscriptionChargeForPeriod` liefert dann keine
 * Abo-Zeile mehr. Der Anbieter verloere die Buchbarkeit in der Sekunde, in der
 * er kuendigt — fuer eine Periode, die er bezahlt hat.
 *
 * **Eine offene Rechnung darf hier nichts blockieren.** Wer nicht kuendigen
 * kann, solange er im Zahlungsrueckstand ist, sitzt in einer Falle, die mit
 * jedem Tag teurer wird. Die Sperre gilt der Buchung, nicht dem Ausgang.
 */
export async function scheduleSubscriptionCancellation(
    i: { providerKey: string; reason?: string | null; source: SubscriptionSource; actorId?: string | null },
): Promise<{ ok: true; scheduled: ScheduledChange } | { ok: false; code: ScheduleFailure }> {
    const row = await openRow(i.providerKey);
    if (!row) return { ok: false, code: 'NO_SUBSCRIPTION' };
    if (scheduledOf(row)) return { ok: false, code: 'ALREADY_SCHEDULED' };

    const effective = effectiveDateFor(row, today());
    const requestedAt = new Date().toISOString();
    await supabaseApi.update('provider_subscriptions', { id: row.id }, {
        scheduled_action: 'cancellation',
        scheduled_plan_code: null, scheduled_plan_version: null, scheduled_cadence: null,
        scheduled_effective_on: effective,
        scheduled_requested_at: requestedAt,
    });
    await reviewLog({
        providerKey: i.providerKey, subject: 'subscription', subjectId: String(row.id),
        action: 'subscription_cancellation_scheduled',
        from: `${row.plan_code}/${row.cadence}`, to: `ends ${effective}`,
        reason: i.reason ?? null, actorId: i.actorId ?? null,
        actorKind: i.source === 'admin' ? 'reviewer' : 'provider',
    });
    await supabaseApi.insert('event_log', {
        type: 'provider_subscription_cancellation_scheduled',
        payload: { providerKey: i.providerKey, plan: row.plan_code, effectiveOn: effective },
    }).catch(() => { /* Protokoll ist Beiwerk */ });
    await sagAllen(i.providerKey, i.actorId, {
        type: 'subscription_scheduled', subject: 'provider', subjectId: i.providerKey,
        payload: { providerKey: i.providerKey, from: row.plan_code, effectiveOn: effective },
    });

    return { ok: true, scheduled: { action: 'cancellation', planCode: null, cadence: null, effectiveOn: effective, requestedAt } };
}

/**
 * Nimmt eine Vormerkung zurueck. Bis zum Stichtag jederzeit — ohne Begruendung
 * und ohne Rueckfrage. Eine Kuendigung, die man nicht zurueckziehen kann, waere
 * Reibung ohne Zweck.
 */
export async function withdrawScheduled(
    i: { providerKey: string; source: SubscriptionSource; actorId?: string | null },
): Promise<{ ok: true; withdrew: ScheduleAction } | { ok: false; code: 'NO_SUBSCRIPTION' | 'NOTHING_SCHEDULED' }> {
    const row = await openRow(i.providerKey);
    if (!row) return { ok: false, code: 'NO_SUBSCRIPTION' };
    const sched = scheduledOf(row);
    if (!sched) return { ok: false, code: 'NOTHING_SCHEDULED' };

    await supabaseApi.update('provider_subscriptions', { id: row.id }, {
        scheduled_action: null, scheduled_plan_code: null, scheduled_plan_version: null,
        scheduled_cadence: null, scheduled_effective_on: null, scheduled_requested_at: null,
    });
    await reviewLog({
        providerKey: i.providerKey, subject: 'subscription', subjectId: String(row.id),
        action: 'subscription_schedule_withdrawn',
        from: `${sched.action} ${sched.effectiveOn}`, to: `${row.plan_code}/${row.cadence}`,
        reason: null, actorId: i.actorId ?? null,
        actorKind: i.source === 'admin' ? 'reviewer' : 'provider',
    });
    await supabaseApi.insert('event_log', {
        type: 'provider_subscription_schedule_withdrawn',
        payload: { providerKey: i.providerKey, action: sched.action, effectiveOn: sched.effectiveOn },
    }).catch(() => { /* Protokoll ist Beiwerk */ });

    return { ok: true, withdrew: sched.action };
}

/**
 * Fuehrt eine faellige Vormerkung aus. Laeuft im selben Pass wie das Rollen der
 * Perioden — beides passiert an derselben Grenze, und zwei Laeufe koennten
 * auseinanderlaufen.
 *
 * Der Wechsel wird als **Ende plus Neuanfang** gebucht, nicht als Umschreiben
 * der Zeile: so steht beides im Protokoll, der Rabattzyklus beginnt sauber neu,
 * und `renewal_date` rechnet sich aus der neuen Zahlweise statt aus der alten
 * fortgeschrieben zu werden.
 */
async function executeSchedule(row: any, sched: ScheduledChange, heute: string): Promise<void> {
    const alt = `${row.plan_code}/${row.cadence}`;
    await supabaseApi.update('provider_subscriptions', { id: row.id }, {
        status: 'ended', ended_at: new Date().toISOString(),
        scheduled_action: null, scheduled_plan_code: null, scheduled_plan_version: null,
        scheduled_cadence: null, scheduled_effective_on: null, scheduled_requested_at: null,
    });

    if (sched.action === 'plan_change' && sched.planCode && sched.cadence) {
        // Der neue Zyklus beginnt am Stichtag, nicht heute: haengt der Lauf
        // nach, soll das Abo trotzdem ab dem Termin gelten, zu dem es
        // vorgemerkt war.
        const start = sched.effectiveOn;
        const roll = rollCycle(start, cycleEndFor(start), heute);
        const periode = roll ?? { start, end: cycleEndFor(start) };
        const cfg = await loadPricingConfig();
        const plan = cfg.plans.find((p) => p.code === sched.planCode);
        await supabaseApi.insert('provider_subscriptions', {
            provider_key: row.provider_key,
            plan_code: sched.planCode,
            plan_version: plan?.version ?? row.scheduled_plan_version ?? 1,
            cadence: sched.cadence,
            status: 'active',
            current_period_start: periode.start,
            current_period_end: periode.end,
            renewal_date: renewalAfter(start, sched.cadence, heute),
            source: row.source ?? 'provider_self_serve',
        });
        await reviewLog({
            providerKey: row.provider_key, subject: 'subscription', subjectId: String(row.id),
            action: 'subscription_change_executed', from: alt, to: `${sched.planCode}/${sched.cadence}`,
            reason: `scheduled for ${sched.effectiveOn}`, actorId: null, actorKind: 'system',
        });
    } else {
        await reviewLog({
            providerKey: row.provider_key, subject: 'subscription', subjectId: String(row.id),
            action: 'subscription_cancellation_executed', from: alt, to: 'ended',
            reason: `scheduled for ${sched.effectiveOn}`, actorId: null, actorKind: 'system',
        });
    }

    await supabaseApi.insert('event_log', {
        type: sched.action === 'plan_change'
            ? 'provider_subscription_change_executed'
            : 'provider_subscription_cancellation_executed',
        payload: { providerKey: row.provider_key, from: alt, to: sched.planCode ?? null, effectiveOn: sched.effectiveOn },
    }).catch(() => { /* Protokoll ist Beiwerk */ });

    // Der Stichtag ist da, und niemand hat ihn ausgeloest — der Waechter war
    // es. Ohne diese Nachricht merkt der Anbieter den Wechsel an der naechsten
    // Rechnung und die Kuendigung daran, dass keine Anfragen mehr kommen.
    await sagAllen(row.provider_key, null, {
        type: 'subscription_schedule_done', subject: 'provider', subjectId: row.provider_key,
        payload: {
            providerKey: row.provider_key, from: String(row.plan_code),
            ...(sched.planCode ? { to: sched.planCode } : {}),
            ...(sched.cadence ? { label: sched.cadence } : {}),
            effectiveOn: sched.effectiveOn,
        },
    });

    // Buchbarkeit haengt am Abo. Nach einer Kuendigung faellt sie weg, nach
    // einem Wechsel bleibt sie — beides muss sofort in den Spalten stehen.
    await syncBillingReadiness(row.provider_key).catch(() => null);
}

/**
 * Rollt abgelaufene Zyklen weiter und rechnet den Verlaengerungstermin nach.
 * Ohne das bliebe `current_period_end` fuer immer in der Vergangenheit stehen —
 * und weil `cycleStartFor` (billing.ts) den Rabattzyklus am Zyklusbeginn
 * festmacht, wuerde der Zaehler der Lead-Rabatte nie zuruecksetzen.
 *
 * Nur ein Fortschreiben von Daten: kein Preis, keine Rechnung, keine
 * Verlaengerungsentscheidung. Die Rechnung stellt der Monatslauf.
 */
export async function runSubscriptionPeriodTick(
    shadow = false, now = new Date(),
): Promise<{ checked: number; rolled: number; executed: number }> {
    const day = now.toISOString().slice(0, 10);
    const rows = (await supabaseApi.select('provider_subscriptions', {}, { limit: 5000 })) as any[];
    let rolled = 0, checked = 0, executed = 0;
    for (const row of rows) {
        if (row.ended_at || row.status === 'ended' || row.status === 'cancelled') continue;
        checked++;

        // Faellige Vormerkung zuerst (ADR-0006 B2/C2). Der Stichtag ist
        // `renewal_date` und faellt bei jaehrlicher Zahlweise NICHT mit dem
        // Zyklusende zusammen — deshalb eine eigene Pruefung und nicht ein
        // Anhaengsel am Rollen. Danach ist diese Zeile beendet; die etwaige
        // Nachfolgezeile traegt frische Daten und braucht kein Rollen mehr.
        const sched = scheduledOf(row);
        if (sched && day >= sched.effectiveOn) {
            if (!shadow) await executeSchedule(row, sched, day);
            executed++;
            continue;
        }

        const next = rollCycle(String(row.current_period_start), String(row.current_period_end), day);
        if (!next) continue;
        // Shadow zaehlt, schreibt aber nicht — wie die uebrigen Waechter-Paesse.
        if (shadow) { rolled++; continue; }
        const cadence: Cadence = row.cadence === 'annual' ? 'annual' : 'monthly';
        await supabaseApi.update('provider_subscriptions', { id: row.id }, {
            current_period_start: next.start, current_period_end: next.end,
            // Der Verlaengerungstermin wird vom Abo-Beginn aus neu gerechnet,
            // nicht vom Zyklus fortgeschrieben — beim Jahresabo liegt er elf
            // Monatszyklen weiter als das Zyklusende.
            renewal_date: renewalAfter(String(row.started_at), cadence, day),
        });
        await supabaseApi.insert('event_log', {
            type: 'provider_subscription_period_rolled',
            payload: { providerKey: row.provider_key, from: row.current_period_start, to: next.start },
        }).catch(() => { /* Protokoll ist Beiwerk */ });
        rolled++;
    }
    return { checked, rolled, executed };
}

// ─── Routen ──────────────────────────────────────────────────────────────────

function json(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage, cap = 4_000): Promise<any> {
    return await new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (c: Buffer) => { raw += c.toString(); if (raw.length > cap) { req.destroy(); reject(new Error('payload too large')); } });
        req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('invalid json')); } });
        req.on('error', reject);
    });
}

/**
 * Die Hauptkategorien, fuer die dieser Anbieter freigegeben ist — fuer seine
 * eigene Seite, damit die Tarifwahl an seinen Daten haengt und nicht an einer
 * Empfehlung von uns.
 *
 * Gelesen wird `provider_services`, ABSICHTLICH NICHT die View
 * `matchable_provider_services`. Die View filtert zusaetzlich auf
 * `lifecycle_status` — ein pausiertes Konto haette dort null Zeilen, und die
 * Seite wuerde dem Anbieter "0 Hauptkategorien freigegeben" sagen, obwohl seine
 * Leistungen unveraendert freigegeben sind. Freigabe einer Leistung und
 * Sichtbarkeit des Kontos sind zwei verschiedene Achsen; hier ist die Freigabe
 * gemeint. (Dieselbe Trennung wie bei der Eignung: `draft`, `submitted` und
 * `paused` duerfen waehlen.)
 */
export async function releasedAreasOf(providerKey: string): Promise<Array<{ code: string; label: string }>> {
    const services = (await supabaseApi.select('provider_services', { provider_key: providerKey }, { limit: 500 })) as any[];
    const approved = services.filter((r) => r.status === 'approved' || r.status === 'limited');
    if (!approved.length) return [];
    const cats = (await supabaseApi.select('service_categories', {}, { limit: 500 })) as any[];
    const byCode = new Map<string, any>(cats.map((c) => [c.code, c]));
    const areas = new Map<string, string>();
    for (const r of approved) {
        const cat = byCode.get(r.service_code);
        // Unterkategorie auf ihren Bereich hochrollen; ein unbekannter Code bleibt er selbst.
        const areaCode = cat?.parent_code ?? cat?.code ?? r.service_code;
        if (!areas.has(areaCode)) areas.set(areaCode, byCode.get(areaCode)?.label_en ?? areaCode);
    }
    return [...areas].map(([code, label]) => ({ code, label })).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Was der Anbieter ueber sein eigenes Abo sieht: Tarif, Zyklus, Periode und die
 * waehlbaren Tarife. Nur fuer ihn — Spec B: *"Subscription information is
 * visible only to the provider and authorized CompliHub360 administrators."*
 * Der Ownership-Guard in index.ts steht davor.
 */
export async function handleSubscriptionGet(res: ServerResponse, correlationId: string, providerKey: string): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    const [sub, cfg, released, prov, row] = await Promise.all([
        getActiveSubscription(providerKey), loadPricingConfig(), releasedAreasOf(providerKey),
        supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 }) as Promise<any[]>,
        openRow(providerKey),
    ]);
    const lifecycle = String(prov[0]?.lifecycle_status ?? '');
    const sched = scheduledOf(row);
    // Welche Tarife ueberhaupt vorgemerkt werden koennen — die Grenze vor dem
    // Klick, nicht erst danach als 409. Ein Downgrade unter die genutzten
    // Hauptkategorien wird abgelehnt, also darf die Oberflaeche ihn auch nicht
    // als Wahl anbieten, ohne den Grund zu nennen.
    const used = released.length;
    json(res, 200, {
        ok: true,
        subscription: sub ? {
            plan_code: sub.planCode, cadence: sub.cadence, status: sub.status,
            current_period_start: sub.currentPeriodStart, current_period_end: sub.currentPeriodEnd,
            started_at: sub.startedAt,
            // Die Verlaengerung steht getrennt vom Periodenende: der Zyklus ist
            // immer monatlich (Rabattzaehler), die Verlaengerung folgt der
            // Zahlweise. Die Oberflaeche muss beides getrennt zeigen koennen.
            renewal_date: sub.renewalDate,
        } : null,
        // Die freigegebenen Hauptkategorien des Anbieters — die Zahl, an der die
        // Tarifwahl haengt. Sie kommt aus seinen Daten, nicht aus einer
        // Empfehlung von uns ("we do not create needs").
        released_categories: released,
        // Ob dieses Konto ueberhaupt ein Abo beginnen kann — und warum nicht.
        // Die POST-Route antwortet sonst erst nach dem Klick mit 409, und der
        // Anbieter erfuehre die Grenze erst, nachdem er sich entschieden hat.
        // `terminated` und `suspended` sind zwei verschiedene Lagen und
        // brauchen zwei verschiedene Saetze — deshalb der Grund, nicht nur ein
        // Flag.
        eligibility: {
            can_start: !NOT_ELIGIBLE.has(lifecycle),
            reason: NOT_ELIGIBLE.has(lifecycle) ? lifecycle : null,
        },
        // Die Tarife mit Preis — und ohne jede Andeutung, der Tarif beeinflusse
        // die Sichtbarkeit. Er tut es nicht.
        plans: cfg.plans.map((p) => ({
            code: p.code, label: p.label, currency: p.currency,
            monthly_cents: p.monthlyCents, annual_cents: p.annualCents,
            category_allowance: p.categoryAllowance,
            lead_discount_pct: p.leadDiscountPct, lead_discount_count: p.leadDiscountCount,
            // `null` heisst "alle Bereiche"; dann passt jede Zahl.
            fits_released: p.categoryAllowance == null || used <= p.categoryAllowance,
        })),
        // Was zum Stichtag passiert, falls etwas vorgemerkt ist. Bis dahin
        // aendert sich nichts — deshalb steht es NEBEN dem laufenden Abo und
        // ersetzt es nicht.
        scheduled: sched ? {
            action: sched.action,
            plan_code: sched.planCode,
            cadence: sched.cadence,
            effective_on: sched.effectiveOn,
            requested_at: sched.requestedAt,
        } : null,
        correlationId,
    });
}

/**
 * Die Tarifwahl des Anbieters: das Abo beginnen. Wechsel und Kuendigung haben
 * eigene Routen (`.../subscription/schedule`), weil sie etwas anderes tun —
 * sie merken vor, statt sofort zu wirken.
 */
export async function handleSubscriptionSelect(
    req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string,
): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    let body: any;
    try {
        body = await readJson(req);
    } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: msg === 'payload too large' ? 'Body too large' : 'Body must be JSON', correlationId });
        return;
    }
    const planCode = typeof body.plan_code === 'string' ? body.plan_code : '';
    const cadence = body.cadence === 'annual' ? 'annual' : body.cadence === 'monthly' ? 'monthly' : null;
    if (!planCode || !cadence) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'plan_code and cadence (monthly|annual) are required', correlationId });
        return;
    }
    const r = await startSubscription({
        providerKey, planCode, cadence, source: 'provider_self_serve', actorId: caller.userId,
    });
    if (!r.ok) {
        if (r.code === 'PROVIDER_NOT_FOUND') { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return; }
        if (r.code === 'UNKNOWN_PLAN') { json(res, 400, { errorCode: 'UNKNOWN_PLAN', message: 'No such plan', correlationId }); return; }
        if (r.code === 'INVALID_CADENCE') { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'cadence must be monthly or annual', correlationId }); return; }
        if (r.code === 'PROVIDER_NOT_ELIGIBLE') {
            json(res, 409, {
                errorCode: 'PROVIDER_NOT_ELIGIBLE',
                message: 'This account cannot start a subscription. Please contact us.',
                correlationId,
            });
            return;
        }
        json(res, 409, {
            errorCode: 'SUBSCRIPTION_EXISTS',
            message: 'A subscription is already running. Use the schedule endpoint to change or cancel it.',
            correlationId,
        });
        return;
    }
    json(res, 201, {
        ok: true,
        subscription: {
            plan_code: r.subscription.planCode, cadence: r.subscription.cadence, status: r.subscription.status,
            current_period_start: r.subscription.currentPeriodStart, current_period_end: r.subscription.currentPeriodEnd,
        },
        correlationId,
    });
}

/**
 * Vormerken und Zuruecknehmen: `POST .../subscription/schedule` mit
 * `{action: 'plan_change'|'cancellation'|'withdraw', plan_code?, cadence?}`.
 *
 * Eine Route fuer drei Vorgaenge, weil sie denselben Zustand betreffen: es gibt
 * hoechstens eine Vormerkung, und sie ist entweder gesetzt oder nicht.
 */
export async function handleSubscriptionSchedule(
    req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string,
): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    let body: any;
    try {
        body = await readJson(req);
    } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: msg === 'payload too large' ? 'Body too large' : 'Body must be JSON', correlationId });
        return;
    }
    const action = body.action;

    if (action === 'withdraw') {
        const r = await withdrawScheduled({ providerKey, source: 'provider_self_serve', actorId: caller.userId });
        if (!r.ok) {
            json(res, r.code === 'NO_SUBSCRIPTION' ? 404 : 409, {
                errorCode: r.code,
                message: r.code === 'NO_SUBSCRIPTION' ? 'No running subscription' : 'Nothing is scheduled',
                correlationId,
            });
            return;
        }
        json(res, 200, { ok: true, withdrew: r.withdrew, correlationId });
        return;
    }

    if (action === 'cancellation') {
        // Bewusst ohne jede Billing-Pruefung: eine offene Rechnung darf den
        // Ausgang nicht verstellen.
        const r = await scheduleSubscriptionCancellation({
            providerKey, source: 'provider_self_serve', actorId: caller.userId,
            reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
        });
        if (!r.ok) {
            json(res, r.code === 'NO_SUBSCRIPTION' ? 404 : 409, {
                errorCode: r.code,
                message: r.code === 'NO_SUBSCRIPTION' ? 'No running subscription' : 'Something is already scheduled',
                correlationId,
            });
            return;
        }
        json(res, 200, { ok: true, scheduled: toWire(r.scheduled), correlationId });
        return;
    }

    if (action === 'plan_change') {
        const planCode = typeof body.plan_code === 'string' ? body.plan_code : '';
        const cadence = body.cadence === 'annual' ? 'annual' : body.cadence === 'monthly' ? 'monthly' : null;
        if (!planCode || !cadence) {
            json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'plan_code and cadence (monthly|annual) are required', correlationId });
            return;
        }
        const r = await scheduleSubscriptionChange({ providerKey, planCode, cadence, source: 'provider_self_serve', actorId: caller.userId });
        if (!r.ok) {
            if (r.code === 'NO_SUBSCRIPTION') { json(res, 404, { errorCode: r.code, message: 'No running subscription', correlationId }); return; }
            if (r.code === 'UNKNOWN_PLAN') { json(res, 400, { errorCode: r.code, message: 'No such plan', correlationId }); return; }
            if (r.code === 'INVALID_CADENCE') { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'cadence must be monthly or annual', correlationId }); return; }
            if (r.code === 'ALLOWANCE_TOO_SMALL') {
                // Der konkrete Grund, nicht nur die Absage: wie viele Bereiche
                // freigegeben sind und wie viele der Zieltarif traegt. Ohne die
                // Zahlen bliebe nur "geht nicht".
                json(res, 409, {
                    errorCode: r.code, allowance: r.allowance, used: r.used,
                    message: `This plan covers ${r.allowance} main categories, but ${r.used} are released for this account.`,
                    correlationId,
                });
                return;
            }
            json(res, 409, {
                errorCode: r.code,
                message: r.code === 'SAME_PLAN' ? 'This is already the running plan' : 'Something is already scheduled',
                correlationId,
            });
            return;
        }
        json(res, 200, { ok: true, scheduled: toWire(r.scheduled), correlationId });
        return;
    }

    json(res, 400, { errorCode: 'VALIDATION_ERROR', message: "action must be 'plan_change', 'cancellation' or 'withdraw'", correlationId });
}

function toWire(s: ScheduledChange) {
    return {
        action: s.action, plan_code: s.planCode, cadence: s.cadence,
        effective_on: s.effectiveOn, requested_at: s.requestedAt,
    };
}

/**
 * Admin-Zuweisung: `{provider_key, action: 'start'|'end', plan_code?, cadence?,
 * reason?}`. Server-Key oder Admin. Zwei getrennte Vorgaenge, bewusst kein
 * "wechsle auf" — so steht jeder Schritt einzeln im Protokoll und niemand muss
 * eine Pro-rata-Regel annehmen.
 */
export async function handleAdminSubscription(
    req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller,
): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    if (!caller.viaApiKey && !caller.isAdmin) {
        json(res, 403, { errorCode: 'FORBIDDEN', message: 'Subscription assignment is admin-only', correlationId });
        return;
    }
    let body: any;
    try {
        body = await readJson(req);
    } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: msg === 'payload too large' ? 'Body too large' : 'Body must be JSON', correlationId });
        return;
    }
    const providerKey = typeof body.provider_key === 'string' && /^[a-z0-9-]+$/.test(body.provider_key) ? body.provider_key : '';
    if (!providerKey) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'provider_key is required', correlationId });
        return;
    }
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

    if (body.action === 'end') {
        const r = await endSubscription({ providerKey, reason, actorId: caller.userId, source: 'admin' });
        if (!r.ok) { json(res, 409, { errorCode: 'NO_SUBSCRIPTION', message: 'No running subscription', correlationId }); return; }
        json(res, 200, { ok: true, ended_plan: r.endedPlan, correlationId });
        return;
    }
    if (body.action !== 'start') {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: "action must be 'start' or 'end'", correlationId });
        return;
    }
    const planCode = typeof body.plan_code === 'string' ? body.plan_code : '';
    const cadence = body.cadence === 'annual' ? 'annual' : body.cadence === 'monthly' ? 'monthly' : null;
    if (!planCode || !cadence) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'plan_code and cadence (monthly|annual) are required', correlationId });
        return;
    }
    const r = await startSubscription({ providerKey, planCode, cadence, source: 'admin', actorId: caller.userId });
    if (!r.ok) {
        const map: Record<StartFailure, [number, string]> = {
            PROVIDER_NOT_FOUND: [404, 'Provider not found'],
            UNKNOWN_PLAN: [400, 'No such plan'],
            INVALID_CADENCE: [400, 'cadence must be monthly or annual'],
            SUBSCRIPTION_EXISTS: [409, 'A subscription is already running — end it first'],
            PROVIDER_NOT_ELIGIBLE: [409, 'Account is suspended or terminated — change the lifecycle status first'],
        };
        const [status, message] = map[r.code];
        json(res, status, { errorCode: r.code === 'INVALID_CADENCE' ? 'VALIDATION_ERROR' : r.code, message, correlationId });
        return;
    }
    json(res, 201, {
        ok: true,
        subscription: {
            provider_key: providerKey, plan_code: r.subscription.planCode, cadence: r.subscription.cadence,
            current_period_start: r.subscription.currentPeriodStart, current_period_end: r.subscription.currentPeriodEnd,
        },
        correlationId,
    });
}
