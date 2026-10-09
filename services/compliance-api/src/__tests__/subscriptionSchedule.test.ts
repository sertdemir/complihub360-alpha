import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Vormerken: Wechsel und Kuendigung zum Verlaengerungstermin ──────────────
//
// ADR-0006 B2/C2. Zwei Dinge koennen hier still schiefgehen, und beide kosten
// den Anbieter Geld oder Buchbarkeit:
//
//   1. Der Stichtag. `renewal_date` und `current_period_end` sind nur bei
//      monatlicher Zahlweise dasselbe. Wer sie verwechselt, beendet ein
//      bezahltes JAHRESabo nach vier Wochen.
//   2. Der Status. 'cancelled' heisst im Code "jetzt inaktiv" — wer ihn beim
//      Vormerken setzt, nimmt dem Anbieter die Buchbarkeit fuer eine Periode,
//      die er bezahlt hat.

type Zeile = Record<string, any>;
const db: { subs: Zeile[]; services: Zeile[]; cats: Zeile[]; events: Zeile[]; members: Zeile[] } =
    { subs: [], services: [], cats: [], events: [], members: [] };

const treffer = (rows: Zeile[], f: Record<string, any>) =>
    rows.filter((r) => Object.entries(f ?? {}).every(([k, v]) => r[k] === v));

vi.mock('../supabase.js', () => ({
    supabaseApi: {
        select: async (t: string, f: any) => {
            if (t === 'provider_subscriptions') return treffer(db.subs, f);
            if (t === 'provider_services') return treffer(db.services, f);
            if (t === 'service_categories') return db.cats;
            if (t === 'provider_members') return treffer(db.members, f);
            if (t === 'plan_catalog') return PLAENE;
            return [];
        },
        insert: async (t: string, row: Zeile) => {
            if (t === 'provider_subscriptions') { const r = { id: `s${db.subs.length + 1}`, ...row }; db.subs.push(r); return [r]; }
            db.events.push({ t, ...row });
            return [row];
        },
        update: async (t: string, f: any, patch: Zeile) => {
            if (t !== 'provider_subscriptions') return [];
            for (const r of treffer(db.subs, f)) Object.assign(r, patch);
            return [];
        },
    },
}));
vi.mock('../leadCharge.js', () => ({ syncBillingReadiness: async () => null }));
vi.mock('../providerApplication.js', () => ({ reviewLog: async () => null }));

const PLAENE = [
    { code: 'essential', version: 1, label: 'Essential', currency: 'USD', monthly_cents: 5900, annual_cents: 59000, category_allowance: 1, lead_discount_pct: 0, lead_discount_count: 0 },
    { code: 'growth', version: 1, label: 'Growth', currency: 'USD', monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3 },
    { code: 'global', version: 1, label: 'Global', currency: 'USD', monthly_cents: 18900, annual_cents: 189000, category_allowance: null, lead_discount_pct: 15, lead_discount_count: 6 },
];

const {
    scheduleSubscriptionChange, scheduleSubscriptionCancellation, withdrawScheduled,
    runSubscriptionPeriodTick, effectiveDateFor, scheduledOf,
} = await import('../subscriptions.js');

/** Ein laufendes Abo. `renewal` ist der Verlaengerungstermin, `ende` das Zyklusende. */
function abo(opts: Partial<Zeile> = {}): Zeile {
    const r = {
        id: 's1', provider_key: 'kanzlei', plan_code: 'growth', plan_version: 1, cadence: 'monthly',
        status: 'active', current_period_start: '2026-10-01', current_period_end: '2026-11-01',
        renewal_date: '2026-11-01', started_at: '2026-01-01T00:00:00Z', ended_at: null,
        source: 'provider_self_serve', scheduled_action: null, scheduled_effective_on: null,
        ...opts,
    };
    db.subs.push(r);
    return r;
}

/** Zwei freigegebene Hauptkategorien — mehr als Essential (1) traegt. */
function zweiBereiche(): void {
    db.services.push(
        { provider_key: 'kanzlei', service_code: 'vat-reg', status: 'approved' },
        { provider_key: 'kanzlei', service_code: 'customs-decl', status: 'approved' },
    );
    db.cats.push(
        { code: 'vat-reg', parent_code: 'tax-vat', label_en: 'VAT registration' },
        { code: 'customs-decl', parent_code: 'customs', label_en: 'Customs declaration' },
        { code: 'tax-vat', parent_code: null, label_en: 'Tax & VAT' },
        { code: 'customs', parent_code: null, label_en: 'Customs' },
    );
}

/** Zwei Logins auf demselben Konto — die Kuendigung geht beide an. */
function zweiMitglieder(): void {
    db.members.push(
        { provider_key: 'kanzlei', user_id: 'u-inhaber' },
        { provider_key: 'kanzlei', user_id: 'u-buchhaltung' },
    );
}
const nachrichten = () => db.events.filter((e) => e.t === 'notifications');

beforeEach(() => { db.subs = []; db.services = []; db.cats = []; db.events = []; db.members = []; });

describe('Der Stichtag ist die Verlaengerung, nicht das Zyklusende', () => {
    it('nimmt bei einem Jahresabo den Jahrestag, nicht den Monatstag', () => {
        // Der Zyklus laeuft monatlich weiter (Rabattzaehler), die Verlaengerung
        // steht im November 2027. Das Zyklusende waere der 01.11.2026 —
        // zwoelf Monate zu frueh.
        const r = { cadence: 'annual', current_period_end: '2026-11-01', renewal_date: '2027-11-01', started_at: '2025-11-01T00:00:00Z' };
        expect(effectiveDateFor(r, '2026-10-09')).toBe('2027-11-01');
    });

    it('rechnet einen fehlenden Termin aus dem Abo-Beginn', () => {
        // `renewal_date` ist nullable; eine alte Zeile darf nicht dazu fuehren,
        // dass die Vormerkung sofort faellig ist.
        const r = { cadence: 'monthly', renewal_date: null, started_at: '2026-01-15T00:00:00Z' };
        // Beginn am 15., heute der 9. — der naechste Monatstag ist der 15.
        // Oktober. (Meine erste Erwartung hier war der 15. November; die
        // Funktion hatte recht.)
        expect(effectiveDateFor(r, '2026-10-09')).toBe('2026-10-15');
        // Einen Tag nach dem 15. springt er auf den naechsten Monat.
        expect(effectiveDateFor(r, '2026-10-16')).toBe('2026-11-15');
    });

    it('rechnet einen Termin in der VERGANGENHEIT neu, statt ihn zu nehmen', () => {
        // Sonst waere die Vormerkung beim naechsten Waechter-Lauf sofort
        // faellig — der Anbieter haette nie eine Frist gehabt.
        const r = { cadence: 'monthly', renewal_date: '2026-09-01', started_at: '2026-01-15T00:00:00Z' };
        expect(effectiveDateFor(r, '2026-10-09') > '2026-10-09').toBe(true);
    });
});

describe('Vormerken aendert heute nichts', () => {
    it('laesst den Status bei einer Kuendigung auf active', async () => {
        abo();
        const r = await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        expect(r.ok).toBe(true);
        // Die Gegenprobe zum teuersten denkbaren Fehler: 'cancelled' wuerde
        // billingReadiness sofort `inactive_subscription` setzen.
        expect(db.subs[0].status).toBe('active');
        expect(db.subs[0].ended_at).toBeFalsy();
        expect(db.subs[0].scheduled_action).toBe('cancellation');
        expect(db.subs[0].scheduled_effective_on).toBe('2026-11-01');
    });

    it('laesst Tarif und Zahlweise bei einem Wechsel unveraendert', async () => {
        abo();
        await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'global', cadence: 'annual', source: 'provider_self_serve' });
        expect(db.subs[0].plan_code).toBe('growth');
        expect(db.subs[0].cadence).toBe('monthly');
        expect(db.subs[0].scheduled_plan_code).toBe('global');
        expect(db.subs[0].scheduled_cadence).toBe('annual');
    });
});

describe('Ein Downgrade unter die genutzten Bereiche wird abgelehnt', () => {
    it('verweigert Essential bei zwei freigegebenen Hauptkategorien', async () => {
        abo(); zweiBereiche();
        const r = await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'essential', cadence: 'monthly', source: 'provider_self_serve' });
        expect(r.ok).toBe(false);
        if (!r.ok) { expect(r.code).toBe('ALLOWANCE_TOO_SMALL'); expect(r.allowance).toBe(1); expect(r.used).toBe(2); }
        // Nichts vorgemerkt — eine abgelehnte Wahl darf keinen halben Zustand
        // hinterlassen.
        expect(db.subs[0].scheduled_action).toBeFalsy();
    });

    it('erlaubt denselben Wechsel, wenn nur ein Bereich freigegeben ist', async () => {
        abo();
        db.services.push({ provider_key: 'kanzlei', service_code: 'vat-reg', status: 'approved' });
        db.cats.push({ code: 'vat-reg', parent_code: 'tax-vat', label_en: 'VAT' }, { code: 'tax-vat', parent_code: null, label_en: 'Tax & VAT' });
        const r = await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'essential', cadence: 'monthly', source: 'provider_self_serve' });
        expect(r.ok).toBe(true);
    });

    it('laesst Global immer zu — unbegrenzte Bereiche', async () => {
        abo({ plan_code: 'essential' }); zweiBereiche();
        const r = await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'global', cadence: 'monthly', source: 'provider_self_serve' });
        expect(r.ok).toBe(true);
    });
});

describe('Was das Vormerken sonst verweigert', () => {
    it('ohne laufendes Abo', async () => {
        const r = await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        expect(r).toEqual({ ok: false, code: 'NO_SUBSCRIPTION' });
    });

    it('denselben Tarif in derselben Zahlweise', async () => {
        abo();
        const r = await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'growth', cadence: 'monthly', source: 'provider_self_serve' });
        expect(r).toMatchObject({ ok: false, code: 'SAME_PLAN' });
    });

    it('denselben Tarif in ANDERER Zahlweise aber nicht — das ist ein echter Wechsel', async () => {
        abo();
        const r = await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'growth', cadence: 'annual', source: 'provider_self_serve' });
        expect(r.ok).toBe(true);
    });

    it('eine zweite Vormerkung, solange eine steht', async () => {
        abo();
        await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        const r = await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'global', cadence: 'monthly', source: 'provider_self_serve' });
        expect(r).toMatchObject({ ok: false, code: 'ALREADY_SCHEDULED' });
    });
});

describe('Zuruecknehmen', () => {
    it('raeumt alle scheduled-Spalten ab', async () => {
        abo();
        await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'global', cadence: 'annual', source: 'provider_self_serve' });
        const r = await withdrawScheduled({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        expect(r).toEqual({ ok: true, withdrew: 'plan_change' });
        expect(scheduledOf(db.subs[0])).toBeNull();
        expect(db.subs[0].scheduled_plan_code).toBeNull();
        expect(db.subs[0].scheduled_effective_on).toBeNull();
    });

    it('sagt es, wenn nichts vorgemerkt ist', async () => {
        abo();
        expect(await withdrawScheduled({ providerKey: 'kanzlei', source: 'provider_self_serve' }))
            .toEqual({ ok: false, code: 'NOTHING_SCHEDULED' });
    });
});

describe('Der Waechter-Lauf fuehrt zum Stichtag aus', () => {
    it('tut einen Tag VOR dem Stichtag nichts', async () => {
        abo(); await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        const r = await runSubscriptionPeriodTick(false, new Date('2026-10-31T12:00:00Z'));
        expect(r.executed).toBe(0);
        expect(db.subs[0].ended_at).toBeFalsy();
    });

    it('beendet das Abo AM Stichtag', async () => {
        abo(); await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        const r = await runSubscriptionPeriodTick(false, new Date('2026-11-01T12:00:00Z'));
        expect(r.executed).toBe(1);
        expect(db.subs[0].status).toBe('ended');
        expect(db.subs[0].ended_at).toBeTruthy();
        expect(db.subs).toHaveLength(1);  // kein Nachfolger
    });

    it('beendet ein Jahresabo zur Verlaengerung, nicht zum Monatsende', async () => {
        // Der Fall, der die ganze Trennung begruendet.
        abo({ cadence: 'annual', renewal_date: '2027-01-01', current_period_end: '2026-11-01', started_at: '2026-01-01T00:00:00Z' });
        await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        expect(db.subs[0].scheduled_effective_on).toBe('2027-01-01');

        // Zum Monatsende passiert NICHTS ausser dem Rollen des Zyklus.
        const nov = await runSubscriptionPeriodTick(false, new Date('2026-11-02T12:00:00Z'));
        expect(nov.executed).toBe(0);
        expect(db.subs[0].status).toBe('active');

        const jan = await runSubscriptionPeriodTick(false, new Date('2027-01-01T12:00:00Z'));
        expect(jan.executed).toBe(1);
        expect(db.subs[0].status).toBe('ended');
    });

    it('bucht einen Wechsel als Ende plus Neuanfang', async () => {
        abo();
        await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'global', cadence: 'annual', source: 'provider_self_serve' });
        await runSubscriptionPeriodTick(false, new Date('2026-11-01T12:00:00Z'));

        expect(db.subs).toHaveLength(2);
        expect(db.subs[0]).toMatchObject({ status: 'ended', plan_code: 'growth' });
        expect(db.subs[1]).toMatchObject({
            status: 'active', plan_code: 'global', cadence: 'annual',
            current_period_start: '2026-11-01',
            // Der Zyklus bleibt ein MONAT, auch beim Jahresabo — daran haengt
            // der Rabattzaehler.
            current_period_end: '2026-12-01',
            // Die Verlaengerung dagegen folgt der neuen Zahlweise.
            renewal_date: '2027-11-01',
        });
        expect(db.subs[1].scheduled_action).toBeFalsy();
    });

    it('holt eine verspaetete Ausfuehrung nach, ohne den Zyklus in der Vergangenheit zu lassen', async () => {
        abo();
        await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'global', cadence: 'monthly', source: 'provider_self_serve' });
        // Der Lauf haengt zwei Monate nach.
        await runSubscriptionPeriodTick(false, new Date('2027-01-15T12:00:00Z'));
        const neu = db.subs[1];
        expect(neu.plan_code).toBe('global');
        expect(neu.current_period_end > '2027-01-15').toBe(true);
    });

    it('zaehlt im Schattenlauf, schreibt aber nicht', async () => {
        abo(); await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        const r = await runSubscriptionPeriodTick(true, new Date('2026-11-01T12:00:00Z'));
        expect(r.executed).toBe(1);
        expect(db.subs[0].status).toBe('active');
        expect(db.subs).toHaveLength(1);
    });
});

describe('Benachrichtigungen — zwei Zeitpunkte, zwei Nachrichten', () => {
    it('sagt beim Vormerken allen Mitgliedern Bescheid, ausser dem Ausloeser', async () => {
        abo(); zweiMitglieder();
        await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve', actorId: 'u-inhaber' });
        const n = nachrichten();
        // Der Inhaber war dabei — er bekommt nichts (Regel 1 in notifications.ts).
        expect(n.map((x) => x.user_id)).toEqual(['u-buchhaltung']);
        expect(n[0].type).toBe('subscription_scheduled');
        expect(n[0].payload.effectiveOn).toBe('2026-11-01');
    });

    it('sagt am Stichtag ALLEN Bescheid — ausgeloest hat niemand', async () => {
        abo(); zweiMitglieder();
        await scheduleSubscriptionChange({ providerKey: 'kanzlei', planCode: 'global', cadence: 'monthly', source: 'provider_self_serve', actorId: 'u-inhaber' });
        db.events = [];
        await runSubscriptionPeriodTick(false, new Date('2026-11-01T12:00:00Z'));
        const n = nachrichten();
        expect(n.map((x) => x.user_id).sort()).toEqual(['u-buchhaltung', 'u-inhaber']);
        expect(n[0].type).toBe('subscription_schedule_done');
        expect(n[0].payload).toMatchObject({ from: 'growth', to: 'global' });
    });

    it('schickt im Schattenlauf nichts', async () => {
        abo(); zweiMitglieder();
        await scheduleSubscriptionCancellation({ providerKey: 'kanzlei', source: 'provider_self_serve' });
        db.events = [];
        await runSubscriptionPeriodTick(true, new Date('2026-11-01T12:00:00Z'));
        expect(nachrichten()).toHaveLength(0);
    });
});
