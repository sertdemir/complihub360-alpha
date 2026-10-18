import { AlertCircle } from 'lucide-react';
import { TechnicalDetails } from '../results/RiskMapState';

/** Ein Sendefehler im Muster der abgenommenen Zustaende (C3, Punkt 1 und 2):
 *  Ueberschrift, was wahr ist, Technical details mit Referenz. Der Aufrufer
 *  setzt die Knoepfe — meist heisst der Hauptknopf dann „Try Again“. */
export function FailureNote({ heading, message, reference, className = '' }: {
  heading: string;
  message: string;
  reference: { id: string; at: string } | null;
  className?: string;
}) {
  return (
    <div role="alert" className={`space-y-1 rounded-[10px] border border-error-500/30 bg-error-bg px-3.5 py-3 dark:bg-red-500/10 ${className}`}>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-error-700 dark:text-red-300">
        <AlertCircle size={14} aria-hidden="true" />{heading}
      </p>
      <p className="text-[12px] leading-relaxed text-fg-secondary">{message}</p>
      <TechnicalDetails reference={reference} />
    </div>
  );
}
