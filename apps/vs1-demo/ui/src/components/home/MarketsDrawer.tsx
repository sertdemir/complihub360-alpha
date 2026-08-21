import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useTranslation } from 'react-i18next';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, ArrowRight } from 'lucide-react';

// ─── Wizard drawers · Figma 1698:293 (Other Markets) + 1740:428 (Country) ────
// Both open INSIDE the wizard container (absolute, not a viewport portal): a
// blurred scrim sits over the wizard, a 520px sheet slides in from the right.
// All copy lives in the 'home' namespace (marketsDrawer.*, countryInfo.*, account.*).

// ── Shared shell ────────────────────────────────────────────────────────────
function WizardDrawer({ open, onClose, label, children }: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  // Dieser Drawer oeffnet INNERHALB des Wizard-Containers statt als
  // Viewport-Portal — der Fokus konnte deshalb besonders leicht in die Seite
  // dahinter entwischen. aria-modal fehlte hier zusaetzlich.
  const panelRef = useFocusTrap<HTMLElement>(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-30 bg-black/20 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            aria-modal="true"
            tabIndex={-1}
            role="dialog"
            aria-label={label}
            className="absolute right-0 top-0 z-40 flex h-full w-full max-w-[520px] flex-col bg-surface shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.42 }}
          >
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Other Markets list (1698:293) ───────────────────────────────────────────
// Ids double as stable selection values; the i18n key is the lowercase id
// (marketsDrawer.markets.<id>.{name,desc}).
const EUROPEAN_IDS = ['Switzerland', 'Austria', 'Belgium', 'Sweden', 'Denmark', 'Poland', 'Czechia', 'Romania'] as const;
const EXPANDING_IDS = ['Norway', 'Ireland', 'Finland', 'Portugal'] as const;
const TOTAL = EUROPEAN_IDS.length + EXPANDING_IDS.length;

type Market = { id: string; name: string; desc: string };

function MarketsContent({ value, onChange, onClose }: {
  value: string[];
  onChange: (v: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('home');
  const [local, setLocal] = useState<string[]>(value);
  const [query, setQuery] = useState('');
  useEffect(() => {
    setLocal(value);
    setQuery('');
  }, [value]);

  const toMarket = (id: string): Market => ({
    id,
    name: t(`marketsDrawer.markets.${id.toLowerCase()}.name`),
    desc: t(`marketsDrawer.markets.${id.toLowerCase()}.desc`),
  });
  const toggle = (id: string) => setLocal((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const match = (m: Market) => m.name.toLowerCase().includes(query.trim().toLowerCase());
  const eu = EUROPEAN_IDS.map(toMarket).filter(match);
  const ex = EXPANDING_IDS.map(toMarket).filter(match);

  const Row = (m: Market) => {
    const on = local.includes(m.id);
    return (
      <button key={m.id} type="button" onClick={() => toggle(m.id)} className="flex w-full items-start gap-3 py-2.5 text-left">
        <span
          className={
            'mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors ' +
            (on ? 'border-brand bg-brand text-fg-on-brand' : 'border-stroke bg-surface')
          }
        >
          {on && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-fg">{m.name}</span>
          <span className="block text-[12px] text-fg-secondary">{m.desc}</span>
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-stroke-subtle px-8 py-5">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{t('marketsDrawer.header')}</span>
        <button onClick={onClose} aria-label={t('drawer.close')} className="text-fg-tertiary transition-colors hover:text-fg">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-6">
        <h3 className="font-serif text-[32px] font-bold leading-none text-fg">{t('marketsDrawer.title')}</h3>
        <p className="mt-3 text-[14px] font-semibold text-fg-brand">
          {t('marketsDrawer.count', { selected: local.length, total: TOTAL })}
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-fg-secondary">
          {t('marketsDrawer.desc')}
        </p>

        <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-stroke px-4 py-3 focus-within:border-stroke-brand">
          <Search size={16} className="text-fg-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('marketsDrawer.searchPlaceholder')}
            className="w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-tertiary"
          />
        </div>

        <hr className="my-6 border-stroke-subtle" />

        {eu.length > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">{t('marketsDrawer.european')}</p>
            <div className="mt-2">{eu.map(Row)}</div>
          </>
        )}
        {ex.length > 0 && (
          <>
            <hr className="my-6 border-stroke-subtle" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">{t('marketsDrawer.expanding')}</p>
            <div className="mt-2">{ex.map(Row)}</div>
          </>
        )}
        {eu.length === 0 && ex.length === 0 && (
          <p className="py-8 text-center text-[14px] text-fg-tertiary">{t('marketsDrawer.noMatch', { query })}</p>
        )}
        <div className="h-6" />
      </div>

      <div className="border-t border-stroke-subtle px-8 py-5">
        <p className="text-[13px] text-fg-tertiary">{t('marketsDrawer.footNote')}</p>
        <button
          type="button"
          onClick={() => {
            onChange(local);
            onClose();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5"
        >
          {local.length > 0 ? t('marketsDrawer.add', { count: local.length }) : t('marketsDrawer.done')}
          <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}

// ── Country info (1740:428) ─────────────────────────────────────────────────
// Wizard card id → i18n key under countryInfo.countries.<key>. The record also
// marks which markets carry an info sheet (AnimatedWizard checks membership).
export const COUNTRY_INFO: Record<string, string> = {
  Germany: 'germany',
  'United Kingdom': 'unitedKingdom',
  Netherlands: 'netherlands',
  France: 'france',
  Italy: 'italy',
  Spain: 'spain',
  'United States': 'unitedStates',
  'Türkiye': 'turkiye',
};

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex gap-3 text-[14px] text-fg">
            <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountryInfoContent({ id, onSelect, onClose }: {
  id: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('home');
  const key = COUNTRY_INFO[id];
  if (!key) return null;
  const base = `countryInfo.countries.${key}`;
  const cover = [0, 1, 2, 3, 4, 5].map((i) => t(`${base}.cover.${i}`));
  const matters = [0, 1, 2].map((i) => t(`${base}.matters.${i}`));
  return (
    <>
      <div className="flex items-center justify-between px-8 pt-6">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{t('countryInfo.header')}</span>
        <button onClick={onClose} aria-label={t('drawer.close')} className="text-fg-tertiary transition-colors hover:text-fg">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-2">
        <h3 className="font-serif text-[2.25rem] font-bold leading-none text-fg">{t(`${base}.name`)}</h3>
        <p className="mt-3 text-[14px] font-semibold text-fg-brand">
          {t('countryInfo.activeRegime', { regime: t(`${base}.regime`) })}
        </p>
        <p className="mt-5 text-[15px] leading-relaxed text-fg-secondary">{t(`${base}.intro`)}</p>

        <hr className="my-7 border-stroke-subtle" />
        <InfoList title={t('drawer.whatWeCover')} items={cover} />
        <hr className="my-7 border-stroke-subtle" />
        <InfoList title={t('drawer.whenThisMatters')} items={matters} />
        <div className="h-6" />
      </div>

      <div className="border-t border-stroke-subtle bg-surface-secondary px-8 py-5">
        <p className="text-[13px] text-fg-tertiary">{t('drawer.continues')}</p>
        <button
          type="button"
          onClick={() => {
            onSelect(id);
            onClose();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5"
        >
          {t('drawer.seeIfApplies')} <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}

// ── Save progress / free account ─────────────────────────────────────────────
// Copy variants live under account.saveProgress.* and account.freeAccount.*.
export type AccountCopyKey = 'saveProgress' | 'freeAccount';

export function SaveProgressContent({ onClose, copyKey = 'saveProgress' }: { onClose: () => void; copyKey?: AccountCopyKey }) {
  const { t } = useTranslation('home');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const valid = /.+@.+\..+/.test(email);
  const base = `account.${copyKey}`;

  return (
    <>
      <div className="flex items-center justify-between border-b border-stroke-subtle px-8 py-5">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{t(`${base}.eyebrow`)}</span>
        <button onClick={onClose} aria-label={t('drawer.close')} className="text-fg-tertiary transition-colors hover:text-fg">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-6">
        <h3 className="font-serif text-[32px] font-bold leading-tight text-fg">{t(`${base}.title`)}</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-fg-secondary">{t(`${base}.desc`)}</p>

        <ul className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex gap-3 text-[14px] text-fg">
              <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
              {t(`${base}.benefits.${i}`)}
            </li>
          ))}
        </ul>

        {!sent ? (
          <div className="mt-7">
            <label htmlFor="save-email" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">
              {t('account.workEmail')}
            </label>
            <input
              id="save-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('account.emailPlaceholder')}
              className="mt-2 w-full rounded-xl border border-stroke px-4 py-3 text-[15px] text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-brand"
            />
          </div>
        ) : (
          <div className="mt-7 rounded-xl border border-stroke-subtle bg-surface-secondary p-5 text-[14px] text-fg">
            <p className="font-semibold text-fg-brand">{t('account.checkInbox')}</p>
            <p className="mt-1 text-fg-secondary">
              {t('account.sentTo.pre')}
              <span className="font-semibold text-fg">{email}</span>
              {t('account.sentTo.post')} {t(`${base}.confirm`)}
            </p>
          </div>
        )}
        <div className="h-6" />
      </div>

      <div className="border-t border-stroke-subtle px-8 py-5">
        <p className="text-[13px] text-fg-tertiary">{t('account.footNote')}</p>
        <button
          type="button"
          disabled={!sent && !valid}
          onClick={async () => {
            if (sent) { onClose(); return; }
            // Real magic-link signup (Wave A2): the link returns to /results,
            // where the saved profile (localStorage) rebuilds the page and the
            // fresh session unlocks the partner matches.
            const sb = isSupabaseConfigured ? await getSupabase() : null;
            if (sb) {
              const lang = document.documentElement.lang || 'en';
              await sb.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: `${window.location.origin}/${lang}/results` },
              }).catch(() => { /* rate-limit etc. — sent state still shows guidance */ });
            }
            setSent(true);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
        >
          {sent ? t('account.done') : t(`${base}.cta`)} <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}

// ── Drawer layer rendered inside the wizard ──────────────────────────────────
export function WizardDrawerLayer({
  marketsOpen,
  onMarketsClose,
  value,
  onChange,
  infoCountry,
  onInfoClose,
  onSelectCountry,
  saveOpen,
  onSaveClose,
}: {
  marketsOpen: boolean;
  onMarketsClose: () => void;
  value: string[];
  onChange: (v: string[]) => void;
  infoCountry: string | null;
  onInfoClose: () => void;
  onSelectCountry: (id: string) => void;
  saveOpen: boolean;
  onSaveClose: () => void;
}) {
  const { t } = useTranslation('home');
  return (
    <>
      <WizardDrawer open={marketsOpen} onClose={onMarketsClose} label={t('marketsDrawer.title')}>
        <MarketsContent value={value} onChange={onChange} onClose={onMarketsClose} />
      </WizardDrawer>
      <WizardDrawer open={!!infoCountry} onClose={onInfoClose} label={t('countryInfo.drawerLabel')}>
        {infoCountry && <CountryInfoContent id={infoCountry} onSelect={onSelectCountry} onClose={onInfoClose} />}
      </WizardDrawer>
      <WizardDrawer open={saveOpen} onClose={onSaveClose} label={t('account.drawerLabel')}>
        <SaveProgressContent onClose={onSaveClose} />
      </WizardDrawer>
    </>
  );
}

// ── Viewport-level free-account drawer (used outside the wizard) ──────────────
// Same content + slide-from-right mechanism as the wizard's Save Progress, but
// portaled to the viewport (frosted scrim over the page) so any section can
// trigger the free-account flow without rendering it as a full page.
export function FreeAccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('home');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120]">
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-label={t('account.drawerLabel')}
            className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col bg-surface shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.42 }}
          >
            <SaveProgressContent onClose={onClose} copyKey="freeAccount" />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
