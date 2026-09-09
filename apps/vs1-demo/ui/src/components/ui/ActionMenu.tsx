import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

// ─── ···-Menü ────────────────────────────────────────────────────────────────
// Das Aktionsmenü einer Zeile oder Kachel: ein ···-Knopf, darunter eine kurze
// Liste (PDF · Umbenennen · Archivieren). Bis 2026-09-09 lebte es seiten-lokal
// in der Termine-Seite; mit den Sitzungs-Kacheln (Canvas-Wahl 4B) braucht es
// eine zweite Flaeche — also hierher. NavMenu ist Navigation, SelectMenu ein
// Formularfeld; dies hier ist keins von beiden.
//
// Schliesst bei Klick ausserhalb und bei Escape. Ein Eintrag mit `danger`
// (Absagen, Archivieren) steht in Rot.

export interface ActionMenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

export function ActionMenu({ label, items, align = 'end', className = '' }: {
  /** Barrierefreie Beschriftung des ···-Knopfs ("Weitere Aktionen"). */
  label: string;
  items: ActionMenuItem[];
  /** Wo die Liste am Knopf haengt: `end` (rechtsbuendig, Zeilenende) oder
   *  `start` (linksbuendig, wenn der Knopf am linken Rand einer Kachel sitzt). */
  align?: 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-md border border-stroke bg-surface text-fg-secondary transition-colors hover:text-fg"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div role="menu" className={`absolute top-9 z-20 min-w-[180px] rounded-lg border border-stroke bg-surface p-1 shadow-md ${align === 'end' ? 'right-0' : 'left-0'}`}>
          {items.map((i) => (
            <button
              key={i.label}
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); i.onClick(); }}
              className={`block w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                i.danger
                  ? 'text-error-700 hover:bg-error-bg/60 dark:text-red-300 dark:hover:bg-red-500/10'
                  : 'text-fg hover:bg-surface-secondary'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
