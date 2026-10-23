import { useEffect, useState } from 'react';
import { fetchMyAgreements, type UserAgreementState } from '../api/agreements';

// ─── Gate fuer die Beta-Vereinbarung (Canvas-Wahl 2A) ────────────────────────
// Nach dem Login fragt der AuthGuard einmal je Sitzung, ob die geltende
// Fassung angenommen ist. Ist sie es nicht, fuehrt der Weg ueber den eigenen
// Schritt (/beta-agreement), danach wie gewohnt. Der Stand wird hier
// zwischengespeichert, damit nicht jede Seite neu fragt; die Annahme im
// Schritt schreibt ihn direkt um.
//
// Fehlt die Antwort (Netz, alter Server ohne Route), bleibt der Weg offen:
// ein Ausfall darf niemanden aussperren, und die naechste Sitzung fragt neu.

export type GateStatus = 'loading' | 'required' | 'ok';

let cache: Promise<UserAgreementState | null> | null = null;
let known: { required: boolean } | null = null;

export function resetAgreementGate(): void {
  cache = null;
  known = null;
}

/** Der Schritt hat die Annahme geschrieben — ab jetzt frei, ohne neue Abfrage. */
export function markBetaAccepted(): void {
  known = { required: false };
  cache = null;
}

export async function loadBetaState(lang: string): Promise<UserAgreementState | null> {
  if (!cache) {
    cache = fetchMyAgreements(lang)
      .then((m) => { const s = m.beta ?? null; known = { required: !!s?.required }; return s; })
      .catch(() => { known = { required: false }; return null; });
  }
  return cache;
}

/** Ob der Nutzer vor dem Workspace noch die Beta-Vereinbarung annehmen muss. */
export function useBetaAgreementGate(enabled: boolean, lang: string): GateStatus {
  const [status, setStatus] = useState<GateStatus>(() => (!enabled ? 'ok' : known ? (known.required ? 'required' : 'ok') : 'loading'));
  useEffect(() => {
    if (!enabled) { setStatus('ok'); return; }
    if (known) { setStatus(known.required ? 'required' : 'ok'); return; }
    let alive = true;
    void loadBetaState(lang).then((s) => { if (alive) setStatus(s?.required ? 'required' : 'ok'); });
    return () => { alive = false; };
  }, [enabled, lang]);
  return status;
}
