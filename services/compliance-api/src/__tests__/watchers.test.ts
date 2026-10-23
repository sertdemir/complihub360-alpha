import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── SLA-Waechter (23.10.2026) ───────────────────────────────────────────────
// Drei Befunde, hier festgehalten:
//   1. Die Live-Erinnerung trug kein `stage` — der Pass erkannte sie nicht und
//      schickte bei jedem Lauf eine neue (Staging: 84 Mails, zwei Anbieter).
//   2. Ein Ladefehler bei engagement_requests beendete den ganzen Lauf; alle
//      Passes danach (Bewertungen, Zahlungen, Termine …) fielen still aus.
//   3. Zwei Laeufe zugleich (Takt + Admin-Route) luden dieselben Marker und
//      verschickten doppelt.

const store = vi.hoisted(() => ({
    engagements: [] as any[],
    events: [] as Array<{ type: string; payload: any }>,
    failEngagements: false,
    failMarkers: false,
    failProviders: false,
    inserts: [] as string[],
    gate: null as null | Promise<void>,
}));

vi.mock('../supabase.js', () => ({
    supabaseApi: {
        async select(table: string, match: any) {
            if (table === 'engagement_requests') {
                if (store.gate) await store.gate;
                if (store.failEngagements) throw new Error('Supabase select failed: timeout');
                return match.id ? store.engagements.filter((e) => e.id === match.id) : store.engagements;
            }
            if (table === 'event_log') {
                if (store.failMarkers) throw new Error('Supabase select failed: timeout');
                return store.events.filter((e) => e.type === match.type);
            }
            if (table === 'providers') {
                if (store.failProviders) throw new Error('Supabase select failed: 503');
                return [{ provider_key: 'studio', name: 'Studio', contact_email: 'p@example.com', partner_status: 'active' }];
            }
            return [];
        },
        async selectWhere() { return []; },
        async insert(table: string, data: any) {
            store.inserts.push(table);
            if (table === 'event_log') store.events.push(data);
            return [data];
        },
        async update() { return []; },
        async updateWhere() { return []; },
        async upsert() { return []; },
        async remove() { return []; },
        async rpc() { return []; },
    },
}));

const mail = vi.hoisted(() => ({ magic: 0 }));
vi.mock('../mailer.js', () => ({
    sendMagicLinkMail: vi.fn(async () => { mail.magic++; }),
    sendReviewMail: vi.fn(async () => {}),
    sendMarketCoveredMail: vi.fn(async () => {}),
    sendProviderCoveredMail: vi.fn(async () => {}),
}));
vi.mock('../notifications.js', () => ({ notify: vi.fn(async () => {}) }));

// Die Passes aus anderen Modulen: nur, ob sie laufen.
const passes = vi.hoisted(() => ({ billing: 0 }));
const zero = { errors: 0 };
vi.mock('../leadCharge.js', () => ({
    runBillingReadinessTick: vi.fn(async () => { passes.billing++; return { ...zero, synced: 0, changed: 0 }; }),
    runChargeReconcileTick: vi.fn(async () => ({ ...zero, checked: 0, refunded: 0 })),
}));
vi.mock('../invoiceRetry.js', () => ({ runInvoiceRetryTick: vi.fn(async () => ({ ...zero, notices: 0, attempts: 0, paid: 0 })) }));
vi.mock('../apiRoutes.js', () => ({ runApiRequestLogRetentionTick: vi.fn(async () => ({ ...zero, deleted: 0 })) }));
vi.mock('../subscriptions.js', () => ({ runSubscriptionPeriodTick: vi.fn(async () => ({ ...zero, rolled: 0 })) }));
vi.mock('../changeSchedule.js', () => ({ runScheduledChanges: vi.fn(async () => ({ ...zero, due: 0, applied: 0, stale: 0 })) }));
vi.mock('../attendanceWatch.js', () => ({
    runAppointmentReminderTick: vi.fn(async () => ({ ...zero, appointmentReminders: 0 })),
    runRebookTick: vi.fn(async () => ({ ...zero, rebookReminders: 0, creditsIssued: 0, deadlinesClosed: 0 })),
}));
vi.mock('../disclosure.js', () => ({ runDisclosureAuditTick: vi.fn(async () => ({ checked: 0, audited: 0, released: 0, errors: 0 })) }));

import { runWatcherTick, issueReminder } from '../watchers.js';

const inHours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();
const engagement = (over: Record<string, unknown> = {}) => ({
    id: 'e1', user_id: 'u1', provider_key: 'studio', country: 'DE', category: 'tax', message: '', status: 'delivered',
    sla_confirm_deadline: inHours(2), sla_reply_deadline: null, ...over,
});

describe('SLA-Waechter', () => {
    beforeEach(() => {
        process.env.WATCHERS_SHADOW = 'false';
        store.engagements = []; store.events = []; store.failEngagements = false; store.failMarkers = false; store.failProviders = false; store.inserts = []; store.gate = null;
        mail.magic = 0; passes.billing = 0;
    });
    afterEach(() => { delete process.env.WATCHERS_SHADOW; });

    it('live: eine Erinnerung je Anfrage, nicht eine je Lauf', async () => {
        store.engagements = [engagement()];
        expect((await runWatcherTick()).reminders).toBe(1);
        expect((await runWatcherTick()).reminders).toBe(0);
        expect((await runWatcherTick()).reminders).toBe(0);
        expect(mail.magic).toBe(1);
        expect(store.events.filter((e) => e.type === 'sla_reminder_sent').map((e) => e.payload.stage)).toEqual(['confirm']);
    });

    it('eine Erinnerung von Hand traegt ihre eigene Stufe und ersetzt die automatische nicht', async () => {
        store.engagements = [engagement()];
        expect(await issueReminder('e1', { auto: false })).toBe('ok');
        expect(store.events[0].payload).toMatchObject({ engagementId: 'e1', auto: false, stage: 'manual' });
        expect((await runWatcherTick()).reminders).toBe(1);
    });

    it('scheitert das Lesen des Anbieters, steht nichts im Protokoll — der naechste Lauf versucht es wieder', async () => {
        store.engagements = [engagement()];
        store.failProviders = true;
        const s = await runWatcherTick();
        expect(s).toMatchObject({ reminders: 0 });
        expect(s.errors).toBeGreaterThanOrEqual(1);
        expect(store.inserts).toEqual([]);
        expect(mail.magic).toBe(0);
        store.failProviders = false;
        expect((await runWatcherTick()).reminders).toBe(1);
        expect(mail.magic).toBe(1);
    });

    it('Ladefehler bei den Anfragen: Fehler gezaehlt, die anderen Passes laufen weiter', async () => {
        store.failEngagements = true;
        const s = await runWatcherTick();
        expect(s.errors).toBeGreaterThanOrEqual(1);
        expect(passes.billing).toBe(1);
    });

    it('ohne Marker kein Versand — und die anderen Passes laufen weiter', async () => {
        store.engagements = [engagement()];
        store.failMarkers = true;
        const s = await runWatcherTick();
        expect(s.reminders).toBe(0);
        expect(mail.magic).toBe(0);
        expect(s.errors).toBeGreaterThanOrEqual(1);
        expect(passes.billing).toBe(1);
    });

    it('nie zwei Laeufe zugleich: der zweite tut nichts', async () => {
        store.engagements = [engagement()];
        let open!: () => void;
        store.gate = new Promise<void>((r) => { open = r; });
        const first = runWatcherTick();
        const second = await runWatcherTick();
        expect(second.skipped).toBe(true);
        open();
        expect((await first).reminders).toBe(1);
        expect(mail.magic).toBe(1);
        // Danach laeuft der naechste wieder normal.
        store.gate = null;
        expect((await runWatcherTick()).skipped).toBeUndefined();
    });
});
