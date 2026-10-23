import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';

/** Auf- und zuklappbare Card der Risk Map: Titel mit Anzahl, Unterzeile,
 *  rechts "Show n" / "Hide". Gemeinsam fuer die Pflicht-Cards (F1) und die
 *  Anbieter ohne Passung (F2), damit beide gleich bedient werden. */
export function DisclosureCard({ title, count, sub, defaultOpen, testId, children }: {
  title: string;
  count: number;
  sub: string;
  defaultOpen: boolean;
  testId?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation('results');
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section data-testid={testId} className="overflow-hidden rounded-xl border border-stroke-subtle bg-surface">
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-secondary/50 lg:px-6"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2.5">
              <span className="font-serif text-[1.25rem] font-bold leading-tight text-fg">{title}</span>
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-body-3xs font-semibold text-fg-brand">{count}</span>
            </span>
            <span className="mt-0.5 block text-body-2xs text-fg-secondary">{sub}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-body-2xs font-semibold text-fg-brand">
            {open ? t('clusters.hide') : t('clusters.show', { count: count })}
            {open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </span>
        </button>
      </h2>
      {open && <div id={bodyId}>{children}</div>}
    </section>
  );
}
