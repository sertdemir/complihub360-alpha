import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, ArrowRight } from 'lucide-react';

// ─── Wizard drawers · Figma 1698:293 (Other Markets) + 1740:428 (Country) ────
// Both open INSIDE the wizard container (absolute, not a viewport portal): a
// blurred scrim sits over the wizard, a 520px sheet slides in from the right.

// ── Shared shell ────────────────────────────────────────────────────────────
function WizardDrawer({ open, onClose, label, children }: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
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
type Market = { id: string; name: string; desc: string };

const EUROPEAN: Market[] = [
  { id: 'Switzerland', name: 'Switzerland', desc: 'MwSt · no EU · registration threshold' },
  { id: 'Austria', name: 'Austria', desc: 'EU-VAT · OSS · EPR' },
  { id: 'Belgium', name: 'Belgium', desc: 'EU-VAT · EPR (regional)' },
  { id: 'Sweden', name: 'Sweden', desc: 'EU-VAT · FTI register · EPR' },
  { id: 'Denmark', name: 'Denmark', desc: 'EU-VAT · DRS · EPR' },
  { id: 'Poland', name: 'Poland', desc: 'EU-VAT · JPK_VAT · EPR ROP' },
  { id: 'Czechia', name: 'Czechia', desc: 'EU-VAT · EPR · EET' },
  { id: 'Romania', name: 'Romania', desc: 'EU-VAT · SAF-T · e-Factura' },
];
const EXPANDING: Market[] = [
  { id: 'Norway', name: 'Norway', desc: 'Non-EU · VOEC scheme' },
  { id: 'Ireland', name: 'Ireland', desc: 'EU-VAT · low-tax SaaS' },
  { id: 'Finland', name: 'Finland', desc: 'EU-VAT · OSS · EPR' },
  { id: 'Portugal', name: 'Portugal', desc: 'EU-VAT · SAF-T file format' },
];
const TOTAL = EUROPEAN.length + EXPANDING.length;

function MarketsContent({ value, onChange, onClose }: {
  value: string[];
  onChange: (v: string[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<string[]>(value);
  const [query, setQuery] = useState('');
  useEffect(() => {
    setLocal(value);
    setQuery('');
  }, [value]);

  const toggle = (id: string) => setLocal((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const match = (m: Market) => m.name.toLowerCase().includes(query.trim().toLowerCase());
  const eu = EUROPEAN.filter(match);
  const ex = EXPANDING.filter(match);

  const Row = (m: Market) => {
    const on = local.includes(m.id);
    return (
      <button key={m.id} type="button" onClick={() => toggle(m.id)} className="flex w-full items-start gap-3 py-2.5 text-left">
        <span
          className={
            'mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors ' +
            (on ? 'border-brand bg-brand text-white' : 'border-stroke bg-surface')
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
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">Markets</span>
        <button onClick={onClose} aria-label="Close" className="text-fg-tertiary transition-colors hover:text-fg">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-6">
        <h3 className="font-serif text-[32px] font-bold leading-none text-fg">Other markets</h3>
        <p className="mt-3 text-[14px] font-semibold text-fg-brand">
          {local.length} selected · {TOTAL} available
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-fg-secondary">
          Outside the headline grid. Pick the markets you operate in — we map their regulations and route to the right
          Verified Partner.
        </p>

        <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-stroke px-4 py-3 focus-within:border-stroke-brand">
          <Search size={16} className="text-fg-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or country code"
            className="w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-tertiary"
          />
        </div>

        <hr className="my-6 border-stroke-subtle" />

        {eu.length > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">European markets</p>
            <div className="mt-2">{eu.map(Row)}</div>
          </>
        )}
        {ex.length > 0 && (
          <>
            <hr className="my-6 border-stroke-subtle" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">Coverage expanding</p>
            <div className="mt-2">{ex.map(Row)}</div>
          </>
        )}
        {eu.length === 0 && ex.length === 0 && (
          <p className="py-8 text-center text-[14px] text-fg-tertiary">No markets match &ldquo;{query}&rdquo;.</p>
        )}
        <div className="h-6" />
      </div>

      <div className="border-t border-stroke-subtle px-8 py-5">
        <p className="text-[13px] text-fg-tertiary">Selections add to your risk map. Edit anytime in Step 4.</p>
        <button
          type="button"
          onClick={() => {
            onChange(local);
            onClose();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5"
        >
          {local.length > 0 ? `Add ${local.length} Market${local.length > 1 ? 's' : ''}` : 'Done'}
          <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}

// ── Country info (1740:428) ─────────────────────────────────────────────────
export type CountryInfo = { regime: string; intro: string; cover: string[]; matters: string[] };

export const COUNTRY_INFO: Record<string, CountryInfo> = {
  Germany: {
    regime: 'VAT · OSS · LUCID · GwG',
    intro:
      'Germany runs 19% standard VAT with mandatory OSS for cross-border B2C above €10,000. EPR registration is centralized through LUCID (Verpackungsregister) with separate streams for packaging, batteries, and WEEE. UStG, VerpackG, and GwG are the primary statutes you will encounter.',
    cover: [
      'VAT registration · OSS / IOSS quarterly returns',
      'EPR LUCID registration + annual reporting',
      'VerpackG ecomodulation contributions',
      'Beneficial-owner register filings (GwG)',
      'Distance-selling threshold monitoring',
      'Reverse-charge mechanism (UStG §13b)',
    ],
    matters: [
      'You ship physical goods into Germany',
      'Your cross-border B2C revenue crosses €10,000',
      'You join Amazon FBA-DE or a German marketplace',
    ],
  },
  'United Kingdom': {
    regime: 'UK VAT · Packaging EPR · WEEE · PPT',
    intro:
      'Post-Brexit, the UK sits outside the EU OSS. You register for UK VAT once you sell to UK consumers, with marketplaces often the deemed supplier. Packaging EPR and WEEE run through national schemes, separate from any EU registration.',
    cover: [
      'UK VAT registration & returns',
      'Marketplace deemed-supplier rules',
      'Packaging EPR (pEPR) reporting',
      'WEEE & battery registration',
      'Import VAT (postponed accounting)',
      'Plastic Packaging Tax (PPT)',
    ],
    matters: [
      'You sell to UK consumers post-Brexit',
      'You import goods into Great Britain',
      'You place packaging on the UK market',
    ],
  },
  Netherlands: {
    regime: 'EU-VAT · OSS · WEEE · UPV',
    intro:
      'The Netherlands applies standard EU VAT with OSS for cross-border B2C. Producer responsibility covers packaging (Afvalfonds / UPV), electronics (WEEE), and batteries — each with its own registration and reporting cadence.',
    cover: [
      'EU-VAT registration · OSS returns',
      'Packaging UPV / Afvalfonds reporting',
      'WEEE (NL) registration',
      'Battery & accumulator obligations',
      'Distance-selling threshold monitoring',
      'Intra-community supply VAT',
    ],
    matters: [
      'You sell B2C into the Netherlands',
      'You ship packaged goods to NL consumers',
      'You hold stock in a Dutch warehouse',
    ],
  },
  France: {
    regime: 'EU-VAT · OSS · EPR (AGEC) · Triman',
    intro:
      'France runs EU VAT with OSS and one of the broadest EPR regimes under the AGEC law — packaging, electronics, furniture, textiles and more, each with a unique identifier (IDU) and eco-organisme. Ecomodulation and repairability scores increasingly apply.',
    cover: [
      'EU-VAT registration · OSS returns',
      'EPR registration & unique IDs (IDU)',
      'AGEC ecomodulation contributions',
      'WEEE & battery schemes',
      'Triman & sorting-info labelling',
      'Repairability / durability index',
    ],
    matters: [
      'You sell B2C into France',
      'You place packaging or EEE on the French market',
      'You sell textiles, furniture or toys to FR consumers',
    ],
  },
  Italy: {
    regime: 'EU-VAT · OSS · CONAI · REACH',
    intro:
      'Italy applies EU VAT with OSS and mandatory e-invoicing (SdI) for many flows. Packaging EPR runs through CONAI with environmental-labelling obligations, while REACH applies to chemical content in goods.',
    cover: [
      'EU-VAT registration · OSS returns',
      'SdI e-invoicing where required',
      'CONAI packaging contributions',
      'Environmental labelling (CONAI)',
      'WEEE & battery registration',
      'REACH substance obligations',
    ],
    matters: [
      'You sell B2C into Italy',
      'You place packaging on the Italian market',
      'You ship products with regulated chemical content',
    ],
  },
  Spain: {
    regime: 'EU-VAT · OSS · EPR · Plastic tax',
    intro:
      'Spain runs EU VAT with OSS and has expanded packaging EPR under Royal Decree 1055/2022, including a plastic-packaging tax. Ecodesign and SCIP obligations apply to many product categories.',
    cover: [
      'EU-VAT registration · OSS returns',
      'Packaging EPR registration & reporting',
      'Plastic packaging tax (impuesto)',
      'WEEE & battery schemes',
      'Ecodesign requirements',
      'SCIP / substance notifications',
    ],
    matters: [
      'You sell B2C into Spain',
      'You place plastic packaging on the Spanish market',
      'You ship EEE or regulated products to ES',
    ],
  },
  'United States': {
    regime: 'Sales tax · Nexus · Marketplace facilitator',
    intro:
      'The US has no VAT; state-level sales tax applies once you cross economic nexus thresholds (often $100k or 200 transactions per state). Marketplace facilitator laws shift collection to platforms in most states.',
    cover: [
      'Economic nexus monitoring (per state)',
      'Sales-tax registration & filing',
      'Marketplace facilitator rules',
      'Product taxability mapping',
      'Exemption-certificate handling',
      'Use-tax obligations',
    ],
    matters: [
      'You sell to US consumers across states',
      'You cross a state economic-nexus threshold',
      'You sell on a US marketplace',
    ],
  },
  'Türkiye': {
    regime: 'KDV (VAT) · e-Fatura · e-Arşiv',
    intro:
      'Türkiye applies KDV (VAT) with mandatory e-invoicing (e-Fatura) and e-archive (e-Arşiv) for many taxpayers. Cross-border digital and goods flows carry their own registration and withholding rules, with FX in TRY.',
    cover: [
      'KDV (VAT) registration & returns',
      'e-Fatura / e-Arşiv compliance',
      'Digital-services VAT (where applicable)',
      'Withholding (tevkifat) rules',
      'Customs & import VAT',
      'TRY currency handling',
    ],
    matters: [
      'You sell to Turkish consumers',
      'You issue invoices subject to e-Fatura',
      'You provide digital services into Türkiye',
    ],
  },
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
  const info = COUNTRY_INFO[id];
  if (!info) return null;
  return (
    <>
      <div className="flex items-center justify-between px-8 pt-6">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">Market</span>
        <button onClick={onClose} aria-label="Close" className="text-fg-tertiary transition-colors hover:text-fg">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-2">
        <h3 className="font-serif text-[2.25rem] font-bold leading-none text-fg">{id}</h3>
        <p className="mt-3 text-[14px] font-semibold text-fg-brand">Active regime: {info.regime}</p>
        <p className="mt-5 text-[15px] leading-relaxed text-fg-secondary">{info.intro}</p>

        <hr className="my-7 border-stroke-subtle" />
        <InfoList title="What we cover" items={info.cover} />
        <hr className="my-7 border-stroke-subtle" />
        <InfoList title="When this matters" items={info.matters} />
        <div className="h-6" />
      </div>

      <div className="border-t border-stroke-subtle bg-surface-secondary px-8 py-5">
        <p className="text-[13px] text-fg-tertiary">Continues in the 6-minute assessment.</p>
        <button
          type="button"
          onClick={() => {
            onSelect(id);
            onClose();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5"
        >
          See if this applies to you <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}

// ── Save progress / free account ─────────────────────────────────────────────
export type AccountCopy = {
  eyebrow: string;
  title: string;
  desc: string;
  benefits: string[];
  confirm: string;
  cta: string;
};

const SAVE_PROGRESS_COPY: AccountCopy = {
  eyebrow: 'Free account',
  title: 'Save your progress',
  desc: "Keep your risk map, match with Verified Partners, and get alerts when the rules change — free, no credit card. We'll email you a magic link, so there's no password to remember.",
  benefits: ['Your saved risk-map dossier', 'Verified-Partner matching', 'Alerts when regulations move'],
  confirm: 'Your progress is safe.',
  cta: 'Create free account',
};

export const FREE_ACCOUNT_COPY: AccountCopy = {
  eyebrow: 'Free account',
  title: 'Real-time alerts, free',
  desc: "Unlock real-time alerts the moment a regulation moves in your markets — plus your saved risk map and Verified-Partner matching. Free, no credit card. We'll email you a magic link, so there's no password.",
  benefits: ['Real-time regulatory alerts', 'Your saved risk-map dossier', 'Verified-Partner matching'],
  confirm: 'Click the link to finish setting up your free account.',
  cta: 'Create free account',
};

export function SaveProgressContent({ onClose, copy = SAVE_PROGRESS_COPY }: { onClose: () => void; copy?: AccountCopy }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const valid = /.+@.+\..+/.test(email);

  return (
    <>
      <div className="flex items-center justify-between border-b border-stroke-subtle px-8 py-5">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">{copy.eyebrow}</span>
        <button onClick={onClose} aria-label="Close" className="text-fg-tertiary transition-colors hover:text-fg">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-6">
        <h3 className="font-serif text-[32px] font-bold leading-tight text-fg">{copy.title}</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-fg-secondary">{copy.desc}</p>

        <ul className="mt-6 space-y-3">
          {copy.benefits.map((b) => (
            <li key={b} className="flex gap-3 text-[14px] text-fg">
              <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
              {b}
            </li>
          ))}
        </ul>

        {!sent ? (
          <div className="mt-7">
            <label htmlFor="save-email" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">
              Work email
            </label>
            <input
              id="save-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="mt-2 w-full rounded-xl border border-stroke px-4 py-3 text-[15px] text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-brand"
            />
          </div>
        ) : (
          <div className="mt-7 rounded-xl border border-stroke-subtle bg-surface-secondary p-5 text-[14px] text-fg">
            <p className="font-semibold text-fg-brand">Check your inbox</p>
            <p className="mt-1 text-fg-secondary">
              We sent a magic link to <span className="font-semibold text-fg">{email}</span>. {copy.confirm}
            </p>
          </div>
        )}
        <div className="h-6" />
      </div>

      <div className="border-t border-stroke-subtle px-8 py-5">
        <p className="text-[13px] text-fg-tertiary">Takes 20 seconds · No password · No credit card.</p>
        <button
          type="button"
          disabled={!sent && !valid}
          onClick={async () => {
            if (sent) { onClose(); return; }
            // Real magic-link signup (Wave A2): the link returns to /results,
            // where the saved profile (localStorage) rebuilds the page and the
            // fresh session unlocks the partner matches.
            if (isSupabaseConfigured && supabase) {
              const lang = document.documentElement.lang || 'en';
              await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: `${window.location.origin}/${lang}/results` },
              }).catch(() => { /* rate-limit etc. — sent state still shows guidance */ });
            }
            setSent(true);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
        >
          {sent ? 'Done' : copy.cta} <ArrowRight size={17} />
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
  return (
    <>
      <WizardDrawer open={marketsOpen} onClose={onMarketsClose} label="Other markets">
        <MarketsContent value={value} onChange={onChange} onClose={onMarketsClose} />
      </WizardDrawer>
      <WizardDrawer open={!!infoCountry} onClose={onInfoClose} label="Market detail">
        {infoCountry && <CountryInfoContent id={infoCountry} onSelect={onSelectCountry} onClose={onInfoClose} />}
      </WizardDrawer>
      <WizardDrawer open={saveOpen} onClose={onSaveClose} label="Save your progress">
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
            aria-label="Save your progress"
            className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col bg-surface shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.42 }}
          >
            <SaveProgressContent onClose={onClose} copy={FREE_ACCOUNT_COPY} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
