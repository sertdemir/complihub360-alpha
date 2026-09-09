import { useEffect, useState } from 'react';
import { Archive, PencilLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { patchSession } from '../../api/sessions';
import { DOMAIN_I18N_KEY } from '../../lib/domains';

// ─── Sitzungs-Aktionen (Figma 2654:89 · wiring map B13) ──────────────────────
// Die Schublade hinter dem ···-Menue einer Sitzungs-Kachel (Canvas-Wahl 4B,
// 2026-09-09). Sie oeffnet fuer GENAU EINE Aktion: Umbenennen braucht eine
// Eingabe, Archivieren eine Rueckfrage — beides gehoert nicht in ein Menue.
// "Als Variante kopieren" gibt es seit 4B nur noch IN der Sitzung (Kopfleiste
// der Sitzungsseite); der Duplizieren-Block ist deshalb weg.

export interface SessionActionsTarget {
  id: string;
  title: string;
  domain: string;
  country: string;
  action: 'rename' | 'archive';
}

interface SessionActionsDrawerProps {
  target: SessionActionsTarget | null;
  onClose: () => void;
  onChanged: () => void; // refetch the list after any mutation
}

export function SessionActionsDrawer({ target, onClose, onChanged }: SessionActionsDrawerProps) {
  const { t } = useTranslation('userws');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(target?.title ?? '');
    setBusy(false); setDone(''); setError('');
  }, [target?.id, target?.action]);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true); setError('');
    try {
      await fn();
      setDone(msg);
      onChanged();
      setTimeout(onClose, 900);
    } catch {
      setError(t('sessionActions.actionError'));
    }
    setBusy(false);
  };

  const title = target?.action === 'archive' ? t('sessionActions.archiveTitle') : t('sessionActions.renameTitle');

  return (
    <Drawer open={!!target} onClose={onClose} side="right" size="md" eyebrow={t('sessionActions.eyebrow')} title={title}>
      {target && (
        <div className="space-y-4">
          <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] px-4 py-3">
            <p className="text-[13px] font-semibold text-fg">{target.title}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag tone="brand">{DOMAIN_I18N_KEY[target.domain] ? t(`domain.${DOMAIN_I18N_KEY[target.domain]}`) : target.domain}</Tag>
              <span className="text-[11px] text-fg-tertiary">{target.country}</span>
            </div>
          </div>

          {target.action === 'rename' && (
            <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
              <div className="flex items-center gap-2.5">
                <PencilLine size={15} className="shrink-0 text-fg-accent" />
                <p className="text-[13px] font-semibold text-fg">{t('sessionActions.renameTitle')}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !busy && name.trim().length >= 2 && name.trim() !== target.title) {
                      void run(() => patchSession(target.id, { label: name.trim() }), t('sessionActions.renamed'));
                    }
                  }}
                  className="w-full rounded-lg border border-elevate/10 bg-elevate/5 px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-tertiary focus:border-fg-brand"
                  placeholder={t('sessionActions.namePlaceholder')}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || name.trim().length < 2 || name.trim() === target.title}
                  onClick={() => run(() => patchSession(target.id, { label: name.trim() }), t('sessionActions.renamed'))}
                >
                  {busy ? '…' : t('shared.save')}
                </Button>
              </div>
            </div>
          )}

          {target.action === 'archive' && (
            <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
              <div className="flex items-start gap-3">
                <Archive size={15} className="mt-0.5 shrink-0 text-fg-tertiary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-fg">{t('sessionActions.archiveQuestion')}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">{t('sessionActions.archiveDesc')}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>{t('shared.cancel')}</Button>
                <Button size="sm" variant="secondary" disabled={busy}
                  onClick={() => run(() => patchSession(target.id, { status: 'archived' }), t('sessionActions.archived'))}>
                  {busy ? '…' : t('sessionActions.archiveTitle')}
                </Button>
              </div>
            </div>
          )}

          {done && <p className="rounded-md border border-fg-brand/30 bg-fg-brand/10 px-3 py-2 text-[12px] text-fg-secondary">{done}</p>}
          {error && <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>}
        </div>
      )}
    </Drawer>
  );
}
