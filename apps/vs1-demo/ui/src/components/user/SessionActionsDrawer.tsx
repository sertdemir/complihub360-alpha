import { useEffect, useState } from 'react';
import { Archive, Copy, PencilLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { patchSession, duplicateSession } from '../../api/sessions';
import { DOMAIN_I18N_KEY } from '../../lib/domains';

// ─── Session-Actions drawer (Figma 2654:89 · wiring map B13) ─────────────────
// The "⋯" menu on a session row: rename (label), duplicate (editable copy),
// archive (soft-hide, reversible server-side). Live rows only.

export interface SessionActionsTarget {
  id: string;
  title: string;
  domain: string;
  country: string;
}

interface SessionActionsDrawerProps {
  target: SessionActionsTarget | null;
  onClose: () => void;
  onChanged: () => void; // refetch the list after any mutation
}

// Canonical English domain label → userws translation key (display only).
const DOMAIN_KEY = DOMAIN_I18N_KEY;

export function SessionActionsDrawer({ target, onClose, onChanged }: SessionActionsDrawerProps) {
  const { t, i18n } = useTranslation('userws');
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'rename' | 'duplicate' | 'archive' | null>(null);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(target?.title ?? '');
    setBusy(null); setDone(''); setError('');
  }, [target?.id]);

  const run = async (kind: 'rename' | 'duplicate' | 'archive', fn: () => Promise<unknown>, msg: string) => {
    setBusy(kind); setError('');
    try {
      await fn();
      setDone(msg);
      onChanged();
      if (kind !== 'rename') setTimeout(onClose, 900);
    } catch {
      setError(t('sessionActions.actionError'));
    }
    setBusy(null);
  };

  return (
    <Drawer open={!!target} onClose={onClose} side="right" size="md" eyebrow={t('sessionActions.eyebrow')} title={t('sessionActions.title')}>
      {target && (
        <div className="space-y-4">
          <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] px-4 py-3">
            <p className="text-[13px] font-semibold text-fg">{target.title}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag tone="brand">{DOMAIN_KEY[target.domain] ? t(`domain.${DOMAIN_KEY[target.domain]}`) : target.domain}</Tag>
              <span className="text-[11px] text-fg-tertiary">{target.country}</span>
            </div>
          </div>

          {/* Rename */}
          <div className="rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
            <div className="flex items-center gap-2.5">
              <PencilLine size={15} className="shrink-0 text-fg-accent" />
              <p className="text-[13px] font-semibold text-fg">{t('sessionActions.renameTitle')}</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-elevate/10 bg-elevate/5 px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-tertiary focus:border-fg-brand"
                placeholder={t('sessionActions.namePlaceholder')}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy !== null || name.trim().length < 2 || name.trim() === target.title}
                onClick={() => run('rename', () => patchSession(target.id, { label: name.trim() }), t('sessionActions.renamed'))}
              >
                {busy === 'rename' ? '…' : t('shared.save')}
              </Button>
            </div>
          </div>

          {/* Duplicate */}
          <div className="flex items-start gap-3 rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
            <Copy size={15} className="mt-0.5 shrink-0 text-fg-brand" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-fg">{t('sessionActions.duplicateTitle')}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">{t('sessionActions.duplicateDesc')}</p>
            </div>
            <Button size="sm" variant="secondary" disabled={busy !== null}
              // Kopie anlegen und sofort auf ihr die Antworten-Schublade oeffnen
              // (Canvas-Wahl 2B, 2026-09-05) — "muss da nicht der Wizard starten?"
              onClick={() => run('duplicate', async () => {
                const copyId = await duplicateSession(target.id, t('sessionActions.copyLabel', { label: target.title }));
                navigate(`/${locale}/results?session=${copyId}`, { state: { openAnswers: true } });
              }, t('sessionActions.duplicated'))}>
              {busy === 'duplicate' ? '…' : t('sessionActions.duplicateTitle')}
            </Button>
          </div>

          {/* Archive */}
          <div className="flex items-start gap-3 rounded-lg border border-elevate/10 bg-elevate/[0.03] p-4">
            <Archive size={15} className="mt-0.5 shrink-0 text-fg-tertiary" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-fg">{t('sessionActions.archiveTitle')}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-tertiary">{t('sessionActions.archiveDesc')}</p>
            </div>
            <Button size="sm" variant="ghost" disabled={busy !== null}
              onClick={() => run('archive', () => patchSession(target.id, { status: 'archived' }), t('sessionActions.archived'))}>
              {busy === 'archive' ? '…' : t('sessionActions.archiveTitle')}
            </Button>
          </div>

          {done && <p className="rounded-md border border-fg-brand/30 bg-fg-brand/10 px-3 py-2 text-[12px] text-fg-secondary">{done}</p>}
          {error && <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>}
        </div>
      )}
    </Drawer>
  );
}
