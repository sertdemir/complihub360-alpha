// ─── initialsOf ───────────────────────────────────────────────────────────────
// Die Initialen einer Person aus ihrem Anzeigenamen. Eine Regel, weil dieselbe
// Person sonst je nach Flaeche verschieden abgekuerzt wird: bis 2026-09-22 nahm
// die Kopfzeile `(userName || 'U').charAt(0)` — einen Buchstaben — waehrend
// UserShell zwei nahm. "Serkan Test" war oben S und links ST.
//
// Zwei Buchstaben, wo der Name zwei Teile hat, sonst einer. Getrennt wird an
// Leerzeichen, Punkt, Unterstrich und Bindestrich, damit auch ein aus der
// E-Mail abgeleiteter Name ("serkan.test") sinnvoll zerfaellt — useAuthStore
// bildet genau so einen, wenn kein voller Name in den Metadaten steht.
export function initialsOf(name: string | null | undefined, fallback = 'U'): string {
  const parts = (name ?? '')
    .split(/[\s._-]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  // Array.from statt [0]: ein Emoji oder ein Zeichen ausserhalb der BMP ist
  // eine Ersatzzeichen-Paarung, und charAt(0) schnitte es in der Mitte durch.
  const letters = parts.slice(0, 2).map((p) => Array.from(p)[0] ?? '');
  const out = letters.join('').toUpperCase();
  return out || fallback;
}
