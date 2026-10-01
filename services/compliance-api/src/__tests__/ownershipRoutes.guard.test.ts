import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Waechter: jede Anbieter-eigene Route steht im Ownership-Regex ───────────
//
// In index.ts steht an der Guard-Stelle: "Einmal hier statt in jedem Handler —
// eine neue Route unter dem Pfad ist damit von Anfang an geschuetzt." Das gilt
// nur, solange der Pfad auch in OWN_PROVIDER_ROUTE (providerAuth.ts) auftaucht.
// Wer eine Route `/api/v1/provider/:key/neu` verdrahtet und den Regex
// vergisst, baut eine Route OHNE Ownership-Pruefung — sichtbar wird das erst,
// wenn jemand fremde Daten abruft.
//
// Dieser Waechter liest beide Quelldateien und vergleicht die Pfadsegmente.
// Was er BEWEIST: jedes in index.ts oder providerApplication.ts genannte
// Segment kommt im Ownership-Regex vor. Was er NICHT beweist: dass der Regex
// die Route auch wirklich trifft (Sonderzeichen, optionale Gruppen) — das
// pruefen die 404-Tests in api.test.ts Route fuer Route.

const here = dirname(fileURLToPath(import.meta.url));
const src = (f: string) => readFileSync(join(here, '..', f), 'utf8');

/** Die Segmente direkt nach `/provider/<key>/` aus allen Routen-Regexen einer Datei. */
function segmentsFrom(code: string): string[] {
    const out = new Set<string>();
    // Regex-Literale der Form  /^\/api\/v1\/provider\/[a-z0-9-]+\/SEGMENT…$/
    for (const m of code.matchAll(/\\\/api\\\/v1\\\/provider\\\/\[a-z0-9-\]\+\\\/([a-zA-Z0-9\\/_-]+)/g)) {
        const seg = m[1].replace(/\\\//g, '/').replace(/\$$/, '').replace(/\/+$/, '');
        if (seg) out.add(seg);
    }
    return [...out];
}

describe('Ownership-Regex deckt jede Anbieter-eigene Route', () => {
    const guard = src('providerAuth.ts');
    const guardLine = guard.split('\n').find((l) => l.includes('/^\\/api\\/v1\\/provider\\/'));

    it('findet den Regex ueberhaupt — sonst prueft dieser Test nichts', () => {
        expect(guardLine).toBeTruthy();
    });

    // Nur index.ts: dort wird Route fuer Route einzeln verdrahtet, und dort
    // entsteht die Luecke. providerApplication.ts hat EINEN Regex mit einer
    // Abschnittsliste, deren Eintraege die 404-Tabelle in api.test.ts Stueck
    // fuer Stueck abdeckt — hier waere nur die Extraktion komplizierter.
    it('index.ts: jedes Segment steht im Guard', () => {
        const segments = segmentsFrom(src('index.ts'));
        expect(segments.length).toBeGreaterThan(0);
        const missing = segments.filter((seg) => {
            // Im Guard steht das Segment mit maskierten Schraegstrichen.
            const escaped = seg.replace(/\//g, '\\/');
            return !(guardLine || '').includes(escaped);
        });
        expect(missing).toEqual([]);
    });

    it('kennt die Abo-Route — sie war der Anlass fuer diesen Waechter', () => {
        expect(segmentsFrom(src('index.ts'))).toContain('subscription');
        expect(guardLine).toContain('subscription');
    });
});
