import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { GoldWord, Reveal, Stagger, StaggerItem } from '../providers/SectionHeading';
import { Badge } from '../ui/Badge';

// ─── S7 — Beyond the Assessment (canvas "Homebase" · A dark, 2026-08-25) ─────
// "From one-time check to home base." The abstract stat boxes are gone: each
// bento tile is now a Gradient panel (CLAUDE.md) carrying a FAITHFUL excerpt
// of the real workspace in its ORIGINAL dark mode — the dashboard (resume
// panel, active requests with status pills, saved sessions with the risk
// traffic light), the notifications feed, and the knowledge library. The
// window chrome speaks through the same userws keys the live app uses; the
// row content mirrors the UserHomePage / Notifications / Library fixtures
// verbatim, which are code-side in the app too.
//
// The windows are theme-FIXED to the workspace dark tokens (slate #1f2937 on
// #0f172a, teal #14a89a, gold #D4AF37 — see the .dark block in index.css):
// they depict the product, they do not follow the marketing theme. Window
// headlines are single-colour by user decision — no gold half-words here.
//
// Marketing copy stays in beyond.* ('home' ns), including the Live/Beta pills
// and the founding-member footnote.

// Choreography (user spec 2026-08-25): the Gradient tile stands first, the
// dark window rises onto it a beat later, then the window's rows build up one
// after another; the tile copy settles last. All driven by one variants
// cascade from the outer Stagger, so the three tiles offset each other too.
const winShell = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const, delay: 0.2, when: 'beforeChildren' as const, staggerChildren: 0.09 } },
};
const winItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};
const tileCopy = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const, delay: 1.0 } },
};

function Pill({ children, tone }: { children: React.ReactNode; tone: 'live' | 'beta' }) {
  return tone === 'live' ? (
    <Badge shape="pill" tone="brand" appearance="soft" size="sm" className="uppercase tracking-[0.08em]">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      {children}
    </Badge>
  ) : (
    <Badge shape="pill" tone="accent" appearance="soft" size="sm" className="uppercase tracking-[0.08em] ring-1 ring-inset ring-accent-200">
      {children}
    </Badge>
  );
}

// ── Dark-window primitives (workspace dark tokens, fixed) ────────────────────

function DarkChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[5px] bg-[#14a89a]/[0.12] px-1.5 py-0.5 text-body-4xs font-bold tracking-[0.06em] text-[#2CC0AD]">
      {children}
    </span>
  );
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: 'amber' | 'green' }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-body-4xs font-semibold ${
        tone === 'amber' ? 'bg-accent-500/[0.16] text-accent-500' : 'bg-[#14a89a]/[0.16] text-[#2CC0AD]'
      }`}
    >
      {children}
    </span>
  );
}

function DashboardWindow() {
  const { t } = useTranslation('userws');
  return (
    <motion.div aria-hidden variants={winShell} className="w-full max-w-[620px] overflow-hidden rounded-xl bg-[#0f172a] text-left shadow-[0_40px_90px_-30px_rgba(2,22,17,0.45)]">
      <motion.div variants={winItem} className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <p className="font-serif text-[17px] font-bold text-[#f5f6f8]">
          <Trans t={t} i18nKey="home.title" values={{ name: 'Alex' }} components={{ accent: <span /> }} />
        </p>
        <span className="rounded-lg bg-[#14a89a] px-3 py-1.5 text-body-3xs font-semibold text-[#000b09]">
          {t('shared.startNewSearch')}
        </span>
      </motion.div>
      <motion.div variants={winItem} className="mx-5 flex items-center gap-3 rounded-[10px] border border-accent-500/40 bg-[#3c3e37] px-3.5 py-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-500/[0.18] text-accent-500">
          <Play size={11} className="fill-current" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-body-4xs font-bold uppercase tracking-[0.08em] text-accent-500">{t('home.resumeEyebrow')}</p>
          <p className="text-body-2xs font-semibold text-[#f5f6f8]">VAT registration · Italy</p>
        </div>
        <span className="ml-auto shrink-0 rounded-[7px] bg-accent-500 px-2.5 py-1 text-body-4xs font-semibold text-[#1f2937]">
          {t('home.resume')} →
        </span>
      </motion.div>
      <div className="px-5 pb-1.5 pt-3.5">
        <motion.p variants={winItem} className="mb-2 text-body-2xs font-bold text-[#f5f6f8]">
          {t('home.activeRequests')} <span className="text-[#14a89a]">3</span>
        </motion.p>
        <motion.div variants={winItem} className="flex items-center gap-2.5 rounded-[9px] border border-white/10 bg-[#1f2937] px-3 py-2">
          <StatusPill tone="amber">{t('status.awaitingConfirmation')}</StatusPill>
          <span className="truncate text-body-3xs font-semibold text-[#f5f6f8]">Verifizierte Steuerkanzlei · Norditalien</span>
          <span className="ml-auto shrink-0 text-body-4xs text-[#8c9aa1]">VAT · Italy · 14h</span>
        </motion.div>
        <motion.div variants={winItem} className="mt-1.5 flex items-center gap-2.5 rounded-[9px] border border-white/10 bg-[#1f2937] px-3 py-2">
          <StatusPill tone="green">{t('status.active')}</StatusPill>
          <span className="truncate text-body-3xs font-semibold text-[#f5f6f8]">Verifizierter EPR-Spezialist · Deutschland</span>
          <span className="ml-auto shrink-0 text-body-4xs text-[#8c9aa1]">EPR · France</span>
        </motion.div>
      </div>
      <div className="px-5 pb-5 pt-2">
        <motion.p variants={winItem} className="mb-2 text-body-2xs font-bold text-[#f5f6f8]">
          {t('home.savedSessions')} <span className="text-[#14a89a]">4</span>
        </motion.p>
        <motion.div variants={winItem} className="grid gap-1.5 sm:grid-cols-2">
          <div className="rounded-[9px] border border-white/10 bg-[#1f2937] px-3 py-2">
            <p className="text-body-4xs font-bold tracking-[0.07em] text-[#8c9aa1]">TAX &amp; VAT · IT</p>
            <p className="mt-0.5 text-body-3xs font-semibold text-[#f5f6f8]">VAT registration · Italy</p>
            <p className="mt-0.5 text-body-4xs text-[#fb923c]">● High risk · threshold reached</p>
          </div>
          <div className="rounded-[9px] border border-white/10 bg-[#1f2937] px-3 py-2">
            <p className="text-body-4xs font-bold tracking-[0.07em] text-[#8c9aa1]">PACKAGING · FR</p>
            <p className="mt-0.5 text-body-3xs font-semibold text-[#f5f6f8]">EPR registration · France</p>
            <p className="mt-0.5 text-body-4xs text-[#fbbf24]">● Medium risk · deadline Q3</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

const FEED = [
  { chip: 'MONITORING', title: 'Risk threshold reached · Italy VAT', time: '6h', unread: true },
  { chip: 'REQUEST', title: 'Provider replied · Verifizierte Steuerkanzlei', time: '12 min', unread: true },
  { chip: 'SLA', title: 'SLA reminder · Datenschutz-Kanzlei · UK', time: '4h', unread: false },
] as const;

function NewsWindow() {
  const { t } = useTranslation('userws');
  return (
    <motion.div aria-hidden variants={winShell} className="w-full overflow-hidden rounded-xl bg-[#0f172a] text-left shadow-[0_30px_70px_-30px_rgba(2,22,17,0.4)]">
      <motion.p variants={winItem} className="px-3.5 pb-2 pt-3 font-serif text-body-md font-bold text-[#f5f6f8]">{t('notifications.title')}</motion.p>
      {FEED.map((f) => (
        <motion.div key={f.title} variants={winItem} className="flex items-center gap-2.5 border-t border-white/[0.08] px-3.5 py-2.5">
          <DarkChip>{f.chip}</DarkChip>
          <span className="min-w-0 flex-1 truncate text-body-3xs font-semibold text-[#f5f6f8]">{f.title}</span>
          <span className="shrink-0 text-body-4xs text-[#8c9aa1]">{f.time}</span>
          {f.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />}
        </motion.div>
      ))}
    </motion.div>
  );
}

const LIBRARY = [
  { type: 'WEBINAR', title: 'OSS vs IOSS: live Q&A mit verifizierten Steuerexperten', source: 'CompliHub360 Live · 90 Min.' },
  { type: 'VIDEO', title: 'Italian VAT registration: step-by-step', source: 'CompliHub360 Editorial · 8 Min.' },
] as const;

function LearnWindow() {
  const { t } = useTranslation('userws');
  return (
    <motion.div aria-hidden variants={winShell} className="w-full rounded-xl bg-[#0f172a] px-3.5 py-3 text-left shadow-[0_30px_70px_-30px_rgba(2,22,17,0.4)]">
      {/* library.title carries <accent> markup — rendered plain: window
          headlines are single-colour by user decision. */}
      <motion.p variants={winItem} className="mb-2 font-serif text-body-md font-bold text-[#f5f6f8]">
        <Trans t={t} i18nKey="library.title" components={{ accent: <span /> }} />
      </motion.p>
      <div className="flex flex-col gap-1.5">
        {LIBRARY.map((it) => (
          <motion.div key={it.title} variants={winItem} className="rounded-[9px] border border-white/10 bg-[#1f2937] px-3 py-2.5">
            <div className="flex gap-1.5">
              <DarkChip>{it.type}</DarkChip>
              <DarkChip>TAX &amp; VAT</DarkChip>
            </div>
            <p className="mt-1.5 text-body-3xs font-semibold text-[#f5f6f8]">{it.title}</p>
            <p className="mt-0.5 text-body-4xs text-[#8c9aa1]">{it.source}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── The section ──────────────────────────────────────────────────────────────

function Tile({
  title,
  pill,
  window: win,
  desc,
  goldFrame = false,
  big = false,
}: {
  title: string;
  pill: React.ReactNode;
  window: React.ReactNode;
  desc: string;
  goldFrame?: boolean;
  big?: boolean;
}) {
  return (
    <StaggerItem
      className={`flex flex-col items-center rounded-xl bg-[linear-gradient(165deg,#EAF3F1_0%,#DDECE8_55%,#E9E4D3_100%)] ${
        big ? 'p-6 lg:p-8' : 'p-6'
      } ${goldFrame ? 'border-[1.5px] border-accent-500/55' : ''}`}
    >
      <div className={`flex w-full items-center justify-between gap-3 ${big ? 'mb-5' : 'mb-4'}`}>
        <p className={`font-serif font-bold text-fg ${big ? 'text-[1.375rem]' : 'text-[1.125rem]'}`}>{title}</p>
        {pill}
      </div>
      {win}
      <motion.p variants={tileCopy} className="mt-4 w-full text-body-xs leading-relaxed text-fg-secondary lg:mt-5">{desc}</motion.p>
    </StaggerItem>
  );
}

export function BeyondAssessment() {
  const { t } = useTranslation('home');
  return (
    <section id="beyond" className="bg-surface py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-10">
        <Reveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-brand">
            {t('beyond.eyebrow')}
          </span>
          <h2 className="mt-4 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            {t('beyond.title.pre')}<GoldWord>{t('beyond.title.gold')}</GoldWord>{t('beyond.title.post')}
          </h2>
          <p className="mt-5 text-body leading-relaxed text-fg-secondary">{t('beyond.subtitle')}</p>
        </Reveal>

        <Stagger stagger={0.14} className="mt-14 grid gap-5 lg:grid-cols-[7fr_5fr]">
          <Tile
            big
            title={t('beyond.workspace.title')}
            pill={<Pill tone="live">{t('beyond.pills.live')}</Pill>}
            window={<DashboardWindow />}
            desc={t('beyond.workspace.desc')}
          />
          <div className="grid gap-5">
            <Tile
              title={t('beyond.newsCard.title')}
              pill={<Pill tone="beta">{t('beyond.pills.beta')}</Pill>}
              window={<NewsWindow />}
              desc={t('beyond.newsCard.desc')}
            />
            <Tile
              goldFrame
              title={t('beyond.learn.title')}
              pill={<Pill tone="beta">{t('beyond.pills.beta')}</Pill>}
              window={<LearnWindow />}
              desc={t('beyond.learn.desc')}
            />
          </div>
        </Stagger>

        <Reveal delay={0.1}>
          <p className="mt-10 max-w-[72ch] text-body-2xs leading-relaxed text-fg-tertiary">{t('beyond.footnote')}</p>
        </Reveal>
      </div>
    </section>
  );
}
