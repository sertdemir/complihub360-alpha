import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Waechter: der Weg zurueck darf nicht still zur Sackgasse werden ─────────
//
// ADR-0008 A2. Drei Stellen auf dieser Seite brechen still — Typecheck, Build
// und die uebrigen Tests bleiben gruen, auffallen wuerde es erst einem
// Anbieter, dessen Karte an einem Tag nicht gedeckt war:
//
//   1. DER KNOPF OHNE GRUND. Steht „Zahlungsmittel erneut pruefen" auch bei
//      einer offenen Rechnung oder einem pausierten Konto, klickt der
//      Anbieter auf etwas, das an seiner Sperre nichts aendern kann.
//
//   2. DIE ERGEBNISZEILE IM KASTEN. Bestaetigt die Bank, wird der
//      Status-Kasten gruen. Steht der Satz darin, nimmt der Kasten ihn mit —
//      der Anbieter saehe nie, was gerade passiert ist, nur dass plotzlich
//      alles gruen ist.
//
//   3. „KONNTEN NICHT FRAGEN" ALS ABLEHNUNG. Wer `unreachable` auf
//      `recheckDeclined` abbildet, sagt dem Anbieter, seine Bank habe
//      abgelehnt — und laesst ihn eine Karte wechseln, mit der nichts ist.
//
// Was dieser Test NICHT prueft: wie die Flaeche aussieht.

const seite = readFileSync(resolve(__dirname, 'BillingPage.tsx'), 'utf8');
const client = readFileSync(resolve(__dirname, '../../api/billing.ts'), 'utf8');
const de = JSON.parse(readFileSync(resolve(__dirname, '../../../public/locales/de/providerws.json'), 'utf8'));

describe('Der Knopf haengt am Grund payment_failed', () => {
    it('rendert nur, wenn payment_failed unter den Gruenden steht', () => {
        const i = seite.indexOf("t('billing.recheckButton')");
        expect(i, 'der Knopf wurde umbenannt oder entfernt').toBeGreaterThan(-1);
        // Die Bedingung steht unmittelbar davor, im selben Block.
        const davor = seite.slice(Math.max(0, i - 600), i);
        expect(davor).toContain("readiness.reasons.includes('payment_failed')");
    });

    it('der Hinweis „kein Betrag" steht an derselben Bedingung', () => {
        const i = seite.indexOf("t('billing.recheckHint')");
        expect(i).toBeGreaterThan(-1);
        expect(seite.slice(Math.max(0, i - 400), i)).toContain("readiness.reasons.includes('payment_failed')");
    });
});

describe('Die Ergebniszeile ueberlebt den gruenen Kasten', () => {
    it('steht hinter dem Status-Kasten, nicht in ihm', () => {
        const kastenEnde = seite.indexOf("t('billing.stillVisibleNote')");
        const note = seite.indexOf('{recheckNote && (');
        expect(kastenEnde).toBeGreaterThan(-1);
        expect(note, 'die Ergebniszeile wurde entfernt').toBeGreaterThan(-1);
        expect(note).toBeGreaterThan(kastenEnde);
    });

    it('wird vor jedem neuen Versuch geleert — kein alter Satz neben einem neuen Ergebnis', () => {
        const i = seite.indexOf('const recheck = async () => {');
        expect(i).toBeGreaterThan(-1);
        expect(seite.slice(i, i + 200)).toContain("setRecheckNote('')");
    });
});

describe('Nicht fragen koennen ist keine Ablehnung', () => {
    it('die Oberflaeche hat fuer `unreachable` einen eigenen Satz', () => {
        expect(seite).toContain("t('billing.recheckUnreachable')");
        expect(de.billing.recheckUnreachable).toBeTruthy();
        // Und der Satz sagt es auch: keine Ablehnung, kein verbrauchter Versuch.
        expect(de.billing.recheckUnreachable).toMatch(/keine Ablehnung/);
    });

    it('der Client unterscheidet 503, 429 und alles andere', () => {
        expect(client).toContain("return { outcome: 'not-configured' }");
        expect(client).toContain("outcome: 'rate_limited'");
        expect(client).toContain("return { outcome: 'unreachable' }");
    });
});

describe('Die Copy verspricht nicht mehr, als A2 haelt', () => {
    it('die Bestaetigung gilt fuer jetzt, nicht fuer kuenftige Belastungen', () => {
        expect(de.billing.recheckConfirmed).toMatch(/künftige Belastungen/);
    });

    it('jede Sperr-Meldung nennt den Weg ueber das Portal — die Grenze ist nie der einzige Weg', () => {
        for (const k of ['recheckDeclined', 'recheckRateLimited', 'recheckRateLimitedNoTime', 'recheckNoPaymentMethod'] as const) {
            expect(de.billing[k], k).toMatch(/Portal/);
        }
    });

    it('reason.payment_failed behauptet nicht mehr, nur eine andere Karte helfe', () => {
        // Bis ADR-0008 stand dort „Ein anderes Zahlungsmittel hebt die Sperre
        // auf — dieselbe Karte nicht." Das ist seit A2 falsch.
        expect(de.billing.reason.payment_failed).not.toMatch(/dieselbe Karte nicht/);
        expect(de.billing.reason.payment_failed).toMatch(/erneut prüfen/);
    });
});
