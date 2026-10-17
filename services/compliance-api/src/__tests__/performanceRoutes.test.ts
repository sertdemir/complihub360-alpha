import { describe, it, expect, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Route-Test ohne Netz: Zeilen kommen aus einer Tabelle im Speicher, der
// Rest (Tarif, Benachrichtigung, Mail) ist stillgelegt.
const NOW = '2026-10-11T12:00:00.000Z';
const daysAgo = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();
const tables: Record<string, Array<Record<string, unknown>>> = {
    performance_policy: [{ version: 1, effective_from: '2026-01-01', rate_min_bookings: 5, window_days: 90, incident_window_days: 90, incident_alert_count: 2, incident_pause_count: 3, user_no_show_alert_count: 2 }],
    scheduling: [
        { id: 's1', slot_start: daysAgo(10), status: 'completed' },
        { id: 's2', slot_start: daysAgo(100), status: 'completed' },
        { id: 's3', slot_start: daysAgo(100), status: 'no_show', no_show_by: 'user' },
    ],
    provider_performance_incidents: [], reviews: [], provider_enforcement_actions: [], provider_lead_ledger: [],
};
vi.mock('../supabase.js', () => ({ supabaseApi: { select: async (table: string) => tables[table] ?? [] } }));
vi.mock('../billing.js', () => ({ getActiveSubscription: async () => null, loadPricingConfig: async () => ({ plans: [] }), getDiscountCounter: async () => 0, cycleStartFor: () => '', resolveLedgerStatus: () => 'captured' }));
vi.mock('../notifications.js', () => ({ notify: async () => undefined }));
vi.mock('../mailer.js', () => ({ sendSerialNoShowMail: async () => undefined }));

import { handleProviderPerformance } from '../performanceRoutes.js';

function fakeRes(): { res: ServerResponse; body: () => Record<string, any>; status: () => number } {
    let status = 0; let raw = '';
    const res = {
        setHeader: () => undefined,
        writeHead: (s: number) => { status = s; },
        end: (chunk?: string) => { raw = chunk ?? ''; },
    } as unknown as ServerResponse;
    return { res, body: () => JSON.parse(raw), status: () => status };
}

describe('GET /provider/:key/performance — laufendes Fenster und Vorfenster', () => {
    it('liefert `previous` neben `performance`; Tag 100 zaehlt dort, nicht im laufenden Fenster', async () => {
        vi.useFakeTimers({ now: Date.parse(NOW) });
        try {
            const { res, body, status } = fakeRes();
            await handleProviderPerformance({ url: '/api/v1/provider/k/performance' } as IncomingMessage, res, 'corr-1', 'k');
            expect(status()).toBe(200);
            const b = body();
            expect(b.performance.bookings).toBe(1);
            expect(b.previous.bookings).toBe(2);
            expect(b.previous.window_days).toBe(90);
            expect(Date.parse(b.previous.to)).toBe(Date.parse(b.performance.from) - 1);
            // Zwei Buchungen liegen unter rate_min_bookings 5 → keine Quote.
            expect(b.previous.rates_shown).toBe(false);
            expect(b.previous.attended).toEqual({ count: 1, rate: null, of: 2 });
            expect(b.previous.user_no_show).toEqual({ count: 1, rate: null, of: 2 });
            expect(b.previous.rate_min_bookings).toBe(5);
            // Keine Deltas auf dem Draht — die rechnet die Oberflaeche.
            expect(Object.keys(b)).not.toContain('delta');
        } finally { vi.useRealTimers(); }
    });
});
