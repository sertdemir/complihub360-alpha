import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Waechter: Workspace-Routen und SiteHeader bleiben zusammen ──────────────
//
// `SiteHeader` entscheidet pfadbasiert, ob der Marketing-Header erscheint, und
// haelt dafuer eine eigene Liste der Provider-Workspace-Unterseiten
// (`PROVIDER_WORKSPACE`). Diese Liste doppelt die Routentabelle in `App.tsx`.
//
// Faehrt eine neue Workspace-Seite auf, ohne dort einzutragen, legt sich der
// Marketing-Header ueber die ProviderShell: die Seite funktioniert, sieht aber
// falsch aus, und weder Typecheck noch Build noch ein Test schlagen an. Genau
// das ist am 2026-10-04 mit `/partner-dashboard/subscription` passiert und fiel
// erst im Screenshot auf.
//
// Was dieser Test NICHT prueft: ob der Header auf den uebrigen Seiten richtig
// entscheidet. Er prueft genau die eine Doppelung, an der die Drift entsteht.

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');

/** Die Unterpfade aus `<Route path="partner-dashboard/<seg>" …>` in App.tsx. */
function routeSegments(): string[] {
    const src = read('../../App.tsx');
    const out = new Set<string>();
    for (const m of src.matchAll(/path="partner-dashboard\/([a-z0-9-]+)"/g)) out.add(m[1]);
    return [...out].sort();
}

/** Die Eintraege aus `const PROVIDER_WORKSPACE = [...]` in SiteHeader.tsx. */
function headerList(): string[] {
    const src = read('./SiteHeader.tsx');
    const m = src.match(/const PROVIDER_WORKSPACE = \[([^\]]*)\]/);
    if (!m) throw new Error('PROVIDER_WORKSPACE nicht gefunden — wurde die Liste umbenannt?');
    return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean).sort();
}

describe('SiteHeader kennt jede Provider-Workspace-Route', () => {
    it('findet ueberhaupt Routen und eine Liste', () => {
        // Ohne diese Zusicherung wuerde der Test unten still gruen, sobald eine
        // der beiden Quellen ihre Form aendert.
        expect(routeSegments().length).toBeGreaterThan(5);
        expect(headerList().length).toBeGreaterThan(5);
    });

    it('traegt jeden Routen-Unterpfad in PROVIDER_WORKSPACE', () => {
        const fehlend = routeSegments().filter((seg) => !headerList().includes(seg));
        expect(fehlend, `Diese Seiten bekaemen den Marketing-Header: ${fehlend.join(', ')}`).toEqual([]);
    });

    it('kennt die Tarifwahl', () => {
        // Der konkrete Fall, der den Waechter ausgeloest hat.
        expect(routeSegments()).toContain('subscription');
        expect(headerList()).toContain('subscription');
    });
});
