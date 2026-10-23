// ─── Ist die Datenbank auf dem Stand des Codes? ──────────────────────────────
//
// Beta-Testbuchung 23.10.2026: "column provider_lead_ledger.request_key does
// not exist". Der Deploy lieferte Code aus, dessen Migrationen in der
// Beta-Datenbank fehlten — sieben Stueck seit dem 12.10., ohne dass es jemand
// sah. Der Nutzer bekam "We couldn't complete your booking".
//
// Der Build legt die Liste der Migrationen aus dem Repo neben das Bundle
// (expected-migrations.json). Hier wird sie mit applied_migration_versions()
// verglichen; das Ergebnis steht im Health-Check, und deploy-beta.yml wird
// rot, wenn etwas fehlt. Ohne Liste (lokal, Tests) bleibt der Stand
// "unknown" und nichts blockiert.

import fs from 'node:fs';
import path from 'node:path';
import { structuredLog } from '@complihub360/types';
import { supabaseApi } from './supabase.js';

export type SchemaState = 'current' | 'behind' | 'unknown';

export interface SchemaStatus {
    state: SchemaState;
    missing: string[];
    checkedAt: string | null;
}

const REFRESH_MS = 10 * 60 * 1000;
let status: SchemaStatus = { state: 'unknown', missing: [], checkedAt: null };

/** Rein: Dateinamen aus dem Repo gegen eingespielte Versionen. Eine Datei
 *  gilt als eingespielt, wenn ihr Zeitstempel ODER ihr Name ohne Zeitstempel
 *  (`name:<Name>`) auftaucht — Staging fuehrt aeltere Migrationen mit dem
 *  Zeitstempel des Einspielens und blossem Namen (20261024000000). */
export function missingMigrations(expectedFiles: string[], applied: string[]): string[] {
    const have = new Set(applied);
    return expectedFiles.filter((f) => {
        const m = /^(\d{14})_(.+?)(\.sql)?$/.exec(f);
        if (!m) return false;
        return !have.has(m[1]) && !have.has(`name:${m[2]}`);
    });
}

function readExpected(): string[] | null {
    const candidates = [
        process.env.EXPECTED_MIGRATIONS_FILE,
        process.argv[1] ? path.join(path.dirname(process.argv[1]), 'expected-migrations.json') : undefined,
    ].filter((p): p is string => !!p);
    for (const p of candidates) {
        try {
            const list = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (Array.isArray(list)) return list.filter((x) => typeof x === 'string');
        } catch { /* naechster Kandidat */ }
    }
    return null;
}

export async function refreshSchemaStatus(): Promise<SchemaStatus> {
    const expected = readExpected();
    if (!expected) {
        status = { state: 'unknown', missing: [], checkedAt: new Date().toISOString() };
        return status;
    }
    try {
        const applied = (await supabaseApi.rpc('applied_migration_versions', {})) as unknown;
        const versions = Array.isArray(applied) ? applied.map((r) => (typeof r === 'string' ? r : String(Object.values(r ?? {})[0] ?? ''))) : [];
        const missing = missingMigrations(expected, versions);
        status = { state: missing.length ? 'behind' : 'current', missing, checkedAt: new Date().toISOString() };
        if (missing.length) {
            structuredLog('warn', 'Database is behind the code: migrations missing', {
                correlationId: 'schema', errorCode: 'ERR_SCHEMA_BEHIND', severity: 'warn', route: 'health/schema', missing,
            } as any);
        }
    } catch (err) {
        // Ohne die Funktion (selbst eine Migration) laesst sich nichts sagen.
        status = { state: 'unknown', missing: [], checkedAt: new Date().toISOString() };
        structuredLog('warn', 'Schema check failed', {
            correlationId: 'schema', errorCode: 'ERR_SCHEMA_CHECK', severity: 'warn', route: 'health/schema',
            detail: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
        } as any);
    }
    return status;
}

export const schemaStatus = (): SchemaStatus => status;

let timer: ReturnType<typeof setInterval> | null = null;
export function startSchemaCheck(): void {
    if (timer) return;
    void refreshSchemaStatus();
    timer = setInterval(() => { void refreshSchemaStatus(); }, REFRESH_MS);
    timer.unref?.();
}
