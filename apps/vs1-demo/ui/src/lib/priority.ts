// ─── Priorität: die geteilte Stufen-Konstante (EN-Launch Schritt 3) ──────────
// Checklist v1.0, Terminologie: "Define status and priority values as shared
// design-system constants" und "Rename old internal keys where the concept
// changed". Entscheidung 2026-10-10 (1A · Immediate):
//
//   - Die Engine liefert weiter `severity` mit 'critical' — ein Datenwert, den
//     kein Nutzer sieht (Engine, packages/types, PDF-Daten, RiskBadge-Level,
//     Token --color-risk-critical). Er bleibt.
//   - Sichtbar ist nur die Priorität. Die oberste Stufe heisst "Immediate",
//     nie "Critical" und auch nicht "Urgent": ein Zeitwort statt eines
//     Druckworts (DNA "Prioritize without panic", #54). Die Checkliste ist an
//     dieser Stelle bewusst korrigiert.
//
// Dieser Adapter ist die EINE Stelle zwischen beiden Welten. Wer ein Label
// zeigt, geht ueber priorityOf() und die Schluessel `*.priority.<Stufe>`.

export const PRIORITY_LEVELS = ['immediate', 'high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITY_LEVELS)[number];

/** Die Stufen, wie Engine und RiskBadge sie fuehren. */
export type EngineSeverity = 'critical' | 'high' | 'medium' | 'low';

export function priorityOf(severity: EngineSeverity): Priority {
  return severity === 'critical' ? 'immediate' : severity;
}

/** Kanonisches Englisch, wenn ein Schluessel fehlt (PDF ohne t, Fallbacks). */
export const PRIORITY_EN: Record<Priority, string> = {
  immediate: 'Immediate',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Rueckweg fuer Flaechen, die eine Prioritaet als Wert tragen (Demo-Zeilen
 *  der Startseite) und einen RiskBadge brauchen, der Engine-Stufen kennt. */
export function severityOf(priority: Priority): EngineSeverity {
  return priority === 'immediate' ? 'critical' : priority;
}
