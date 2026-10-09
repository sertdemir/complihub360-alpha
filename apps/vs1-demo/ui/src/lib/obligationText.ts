import { useTranslation } from 'react-i18next';

// ─── Wie eine Pflicht heisst ─────────────────────────────────────────────────
// Die Engine traegt ihre Pflichten auf Englisch: `label` ist der kanonische
// Vorlagenname ("VAT Registration & Filing"), `due` die Kadenz der
// Anreicherung ("Quarterly"). Beides steht so in jeder Oberflaeche, auch in
// der deutschen — Befund des Nutzers 2026-09-16 auf der Bereichsseite.
//
// Uebersetzt wird NICHT hier: `markets.obligations.<id>` und
// `markets.cadence.<due>` liegen seit den Marktseiten in allen vier Sprachen
// und decken alle 21 Pflicht-IDs der Engine ab. Sie waren nur nie an die
// Arbeitsflaeche angeschlossen. Dieses Modul ist der eine Anschluss, damit
// Matrix und Wissenskarten DENSELBEN Namen tragen: bis dahin nannte die
// Matrix eine Pflicht anders als die Karte darunter, und der Leser hatte
// keinen Anhalt, dass beide dieselbe meinen (zweiter Befund).
//
// Der Beschreibungssatz der 21 Vorlagen kam mit dieser Korrektur dazu
// (`markets.obligationDesc.<id>`, ebenfalls vier Sprachen): ein generischer
// Einzeiler je Pflicht, kein Gesetzeszitat — uebersetzbar, ohne dass sich der
// Inhalt verschiebt.
//
// Ohne Eintrag bleibt es beim Text der Engine — lieber der englische
// Vorlagenname als ein erfundener deutscher. Die Strafangaben haben seit
// 2026-10-07 einen eigenen Anschluss (penaltyText in penaltyCeiling.ts).
//
// Seit 2026-10-09 haengen auch Risk Map, Bereichs- und Marktseiten hier dran:
// bis dahin las nur die Arbeitsflaeche die Uebersetzung, und die deutsche
// Risk Map nannte "VAT Registration & Filing · Annual". Die Funktionen ohne
// Hook sind fuer Abbildungen ausserhalb einer Komponente (liveObligations,
// PDF-Export); jede Sprachdatei-Abdeckung prueft obligationText.test.ts.

type T = (key: string, opts: { defaultValue: string }) => string;

/** Der Name der Pflicht in der Sprache des Lesers; sonst der Engine-Titel. */
export const obligationLabel = (t: T, id: string, fallback: string) =>
  t(`common:markets.obligations.${id}`, { defaultValue: fallback });
/** "Quarterly" → "Vierteljährlich"; unbekannte Kadenz bleibt, wie sie kam. */
export const cadenceLabel = (t: T, due: string) => t(`common:markets.cadence.${due}`, { defaultValue: due });
/** Der Beschreibungssatz der Vorlage; sonst der Satz der Engine. */
export const obligationDescription = (t: T, id: string, fallback: string) =>
  t(`common:markets.obligationDesc.${id}`, { defaultValue: fallback });

export function useObligationText() {
  const { t } = useTranslation('common');
  return {
    label: (id: string, fallback: string) => obligationLabel(t, id, fallback),
    cadence: (due: string) => cadenceLabel(t, due),
    description: (id: string, fallback: string) => obligationDescription(t, id, fallback),
  };
}
