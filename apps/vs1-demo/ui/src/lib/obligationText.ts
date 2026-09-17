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
// Vorlagenname als ein erfundener deutscher. Das Bussgeld bleibt deshalb
// unangetastet: dafuer fuehrt das Produkt keine Uebersetzung, und viele
// Angaben stehen bewusst in der Sprache der jeweiligen Rechtsordnung
// ("sanzioni AGCM", "amendes DGCCRF").

export function useObligationText() {
  const { t } = useTranslation('common');
  return {
    /** Der Name der Pflicht in der Sprache des Nutzers; sonst der Engine-Titel. */
    label: (id: string, fallback: string) => t(`markets.obligations.${id}`, { defaultValue: fallback }),
    /** "Quarterly" → "Vierteljährlich"; unbekannte Kadenz bleibt, wie sie kam. */
    cadence: (due: string) => t(`markets.cadence.${due}`, { defaultValue: due }),
    /** Der Beschreibungssatz der Vorlage; sonst der Satz der Engine. */
    description: (id: string, fallback: string) => t(`markets.obligationDesc.${id}`, { defaultValue: fallback }),
  };
}
