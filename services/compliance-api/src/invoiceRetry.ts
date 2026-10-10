import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { notify } from "./notifications.js";
import { sendInvoiceRetryNoticeMail } from "./mailer.js";
import { loadPricingConfig } from "./billing.js";
import { syncBillingReadiness } from "./leadCharge.js";
import { getCustomerBilling, isStripeConfigured, stripeRequest, StripeError } from "./stripe.js";

// ─── Einzug in der Kulanzfrist (ADR-0008, Wahl B2a) ──────────────────────────
//
// Abo-Rechnungen laufen als `send_invoice` mit 14 Tagen Zahlungsziel: Stripe
// belastet dort nie selbst eine Karte, also gibt es auch keinen Versuch, den
// Stripe wiederholen koennte (Smart Retries gelten nur fuer
// `charge_automatically`). B2a holt das in der Kulanzfrist nach, die ADR-0006
// schon beschlossen hat:
//
//   Tag 0 (faellig)   der Anbieter erfaehrt, an welchen Tagen wir die
//                     hinterlegte Karte versuchen — und dass die Frist bleibt.
//   Tag 1, 3, 6       je ein Versuch mit dem Standard-Zahlungsmittel
//                     (`invoices/:id/pay`, off-session). Bezahlt → fertig.
//
// Was hier NIE passiert: `due_at` wird nicht angefasst. Eine Wiederholung
// verschiebt den Stichtag nicht — sonst waeren die sieben Tage „sieben plus so
// viele, wie versucht wird". Versaeumte Tage werden nicht nachgeholt; es zaehlt
// der juengste faellige Versuchstag, je Rechnung hoechstens einmal.
//
// Eingeschaltet erst mit INVOICE_RETRY_ENABLED=1: ob das Zahlungsmandat
// (`billing_authorization`) die Belastung von Abo-Rechnungen deckt, ist zu
// pruefen, bevor eine Karte belastet wird (TKT-PROV-13).

export const RETRY_DAYS = [1, 3, 6] as const;

export function invoiceRetryEnabled(): boolean {
    return process.env.INVOICE_RETRY_ENABLED === '1';
}

const DAY = 86_400_000;
const asDay = (v: string) => Date.parse(`${String(v).slice(0, 10)}T00:00:00Z`);

/** Kalendertage seit Faelligkeit (0 = Faelligkeitstag, negativ = noch nicht faellig). */
export function daysPastDue(dueAt: string, now: Date): number {
    return Math.round((asDay(now.toISOString()) - asDay(dueAt)) / DAY);
}

/** Die Versuchstage, die in die Frist passen — nach dem letzten kulanten Tag wird nicht mehr versucht. */
export function retryDaysWithin(curePeriodDays: number): number[] {
    return RETRY_DAYS.filter((d) => d <= Math.max(0, curePeriodDays));
}

/** Der juengste faellige Versuchstag, oder null. Rein, damit jeder Tag ohne Netz pruefbar ist. */
export function retryStage(dueAt: string, now: Date, curePeriodDays: number): number | null {
    const d = daysPastDue(dueAt, now);
    const due = retryDaysWithin(curePeriodDays).filter((x) => x <= d);
    return due.length ? due[due.length - 1] : null;
}

/** Die Daten der Versuche als 'YYYY-MM-DD' — fuer die Vorab-Nachricht. */
export function retryDates(dueAt: string, curePeriodDays: number): string[] {
    const base = asDay(dueAt);
    return retryDaysWithin(curePeriodDays).map((d) => new Date(base + d * DAY).toISOString().slice(0, 10));
}

interface InvoiceRow { id: string; provider_key: string; invoice_number?: string | null; amount_cents?: number | null; currency?: string | null; due_at?: string | null; status?: string; stripe_invoice_id?: string | null }

export interface InvoiceRetryCounts { notices: number; attempts: number; paid: number; errors: number }

export async function runInvoiceRetryTick(shadow: boolean, now = new Date()): Promise<InvoiceRetryCounts> {
    const out: InvoiceRetryCounts = { notices: 0, attempts: 0, paid: 0, errors: 0 };
    if (!invoiceRetryEnabled() || !isStripeConfigured()) return out;
    const cfg = await loadPricingConfig();
    const invoices = (await supabaseApi.select('invoices', { status: 'open' }, { limit: 500 })) as InvoiceRow[];
    const suffix = shadow ? '_shadow' : '';
    const markers = (await supabaseApi.select('event_log', { type: `invoice_retry${suffix}` }, { limit: 5000 })) as Array<{ payload?: Record<string, unknown> }>;
    const done = new Set(markers.map((m) => `${m.payload?.invoiceId}:${m.payload?.stage}`));

    for (const inv of invoices) {
        if (!inv.due_at || !inv.stripe_invoice_id) continue;
        try {
            const d = daysPastDue(inv.due_at, now);
            if (d < 0 || d > cfg.curePeriodDays) continue;

            // Tag 0 und spaeter: einmal Bescheid geben, bevor zum ersten Mal versucht wird.
            if (!done.has(`${inv.id}:notice`)) {
                await supabaseApi.insert('event_log', { type: `invoice_retry${suffix}`, payload: { invoiceId: inv.id, providerKey: inv.provider_key, stage: 'notice' } });
                done.add(`${inv.id}:notice`);
                out.notices++;
                if (!shadow) await sendNotice(inv, cfg.curePeriodDays);
            }

            const stage = retryStage(inv.due_at, now, cfg.curePeriodDays);
            if (stage === null || done.has(`${inv.id}:${stage}`)) continue;
            await supabaseApi.insert('event_log', { type: `invoice_retry${suffix}`, payload: { invoiceId: inv.id, providerKey: inv.provider_key, stage } });
            done.add(`${inv.id}:${stage}`);
            out.attempts++;
            if (shadow) continue;
            if (await attempt(inv, stage)) out.paid++;
        } catch (err) {
            out.errors++;
            structuredLog('error', 'Invoice retry failed', { correlationId: 'watchers', route: 'watchers/invoice-retry', severity: 'error', errorCode: 'ERR_INVOICE_RETRY', detail: String(err).slice(0, 200) } as Record<string, unknown>);
        }
    }
    return out;
}

async function sendNotice(inv: InvoiceRow, curePeriodDays: number): Promise<void> {
    const prov = ((await supabaseApi.select('providers', { provider_key: inv.provider_key }, { limit: 1 })) as any[])[0];
    const dates = retryDates(inv.due_at!, curePeriodDays);
    const blocksAt = new Date(asDay(inv.due_at!) + (curePeriodDays + 1) * DAY).toISOString().slice(0, 10);
    const members = (await supabaseApi.select('provider_members', { provider_key: inv.provider_key }, { limit: 20 })) as Array<{ user_id: string }>;
    for (const m of members) {
        await notify({ to: m.user_id, actor: null, type: 'invoice_retry_scheduled', subject: 'provider', subjectId: inv.provider_key,
            payload: { providerKey: inv.provider_key, label: inv.invoice_number ?? undefined, deadline: blocksAt }, dedupeKey: `invoice_retry_scheduled:${inv.id}` });
    }
    await sendInvoiceRetryNoticeMail({
        to: prov?.contact_email ?? null, providerKey: inv.provider_key, invoice: inv.invoice_number ?? inv.id,
        amountCents: inv.amount_cents ?? null, currency: inv.currency ?? 'USD', dates, blocksAt,
    });
}

/** Ein Versuch. true = bezahlt. Ein Kartenfehler ist kein Fehler des Laufs, nur ein Ergebnis. */
async function attempt(inv: InvoiceRow, stage: number): Promise<boolean> {
    const prov = ((await supabaseApi.select('providers', { provider_key: inv.provider_key }, { limit: 1 })) as any[])[0];
    const customerId = prov?.stripe_customer_id ? String(prov.stripe_customer_id) : null;
    const pmId = customerId ? (await getCustomerBilling(customerId)).defaultPaymentMethodId : null;
    const log = (type: string, extra: Record<string, unknown>) => supabaseApi.insert('event_log', { type, payload: { invoiceId: inv.id, providerKey: inv.provider_key, stage, ...extra } }).catch(() => {});
    if (!pmId) { await log('invoice_retry_skipped', { reason: 'no_payment_method' }); return false; }
    try {
        const paid = await stripeRequest('POST', `invoices/${inv.stripe_invoice_id}/pay`, { payment_method: pmId, off_session: 'true' },
            { idempotencyKey: `invoice-retry:${inv.id}:${stage}` }) as { status?: string; status_transitions?: { paid_at?: number | null } };
        if (paid.status !== 'paid') { await log('invoice_retry_failed', { reason: paid.status ?? 'unknown' }); return false; }
        await supabaseApi.update('invoices', { id: inv.id }, {
            status: 'paid',
            paid_at: paid.status_transitions?.paid_at ? new Date(paid.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
        });
        await log('invoice_retry_paid', {});
        await syncBillingReadiness(inv.provider_key).catch(() => null);
        return true;
    } catch (err) {
        if (err instanceof StripeError && err.isCardError) { await log('invoice_retry_failed', { reason: err.declineCode || err.code || 'card_error' }); return false; }
        throw err;
    }
}
