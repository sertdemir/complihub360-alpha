import { useEffect, useState } from 'react';
import { Archive, PencilLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { patchSession } from '../../api/sessions';
import { DOMAIN_I18N_KEY } from '../../lib/domains';
import { focusField } from '../ui/FormErrorSummary';
import { FieldError, errorAria } from '../ui/FieldError';

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
  // Regel V2 (11.10.2026): "Speichern" bleibt aktiv. Ein Feld — ist der Name
  // zu kurz, steht der Satz am Feld und der Fokus bleibt dort.
  const [tried, setTried] = useState(false);
  const nameError = tried && name.trim().length < 2 ? t('riskMapActions.nameTooShort') : null;

  useEffect(() => {
    setName(target?.title ?? '');
    setBusy(false); setDone(''); setError(''); setTried(false);
  }, [target?.id, target?.action]);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true); setError('');
    try {
      await fn();
      setDone(msg);
      onChanged();
      setTimeout(onClose, 900);
    } catch {
      setError(t('riskMapActions.actionError'));
    }
    setBusy(false);
  };

  const rename = () => {
    if (!target || busy) return;
    setTried(true);
    if (name.trim().length < 2) { focusField('session-rename'); return; }
    // Unveraenderter Name: nichts zu speichern — kein Fehler, kein Aufruf.
    if (name.trim() === target.title) { onClose(); return; }
    void run(() => patchSession(target.id, { label: name.trim() }), t('riskMapActions.renamed'));
  };

  const title = target?.action === 'archive' ? t('riskMapActions.archiveTitle') : t('riskMapActions.renameTitle');

  return (
    <Drawer open={!!target} onClose={onClose} side="right" size="md" eyebrow={t('riskMapActions.eyebrow')} title={title}>
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
                <label htmlFor="session-rename" className="text-[13px] font-semibold text-fg">{t('riskMapActions.renameTitle')}</label>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="session-rename"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); rename(); }
                  }}
                  className={'w-full rounded-lg border bg-elevate/5 px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-tertiary focus:border-fg-brand '
                    + (nameError ? 'border-error-500' : 'border-elevate/10')}
                  placeholder={t('riskMapActions.namePlaceholder')}
                  {...errorAria('session-rename', !!nameError)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={rename}
                >
                  {busy ? '…' : t('shared.save')}
                </Button>
              </div>
              <FieldError id="session-rename" message={nameError} alert />
            </div>
          )}

          {target.action === 'archive' && (
            <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
              <div className="flex items-start gap-3">
                <Archive size={15} className="mt-0.5 shrink-0 text-fg-tertiary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-fg">{t('riskMapActions.archiveQuestion')}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">{t('riskMapActions.archiveDesc')}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>{t('shared.cancel')}</Button>
                <Button size="sm" variant="secondary" disabled={busy}
                  onClick={() => run(() => patchSession(target.id, { status: 'archived' }), t('riskMapActions.archived'))}>
                  {busy ? '…' : t('riskMapActions.archiveTitle')}
                </Button>
              </div>
            </div>
          )}

          {done && <p className="rounded-md border border-fg-brand/30 bg-fg-brand/10 px-3 py-2 text-[12px] text-fg-secondary">{done}</p>}
          {error && <p role="alert" className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>}
        </div>
      )}
    </Drawer>
  );
}
