import { useTranslation } from 'react-i18next';
import { Star, Lock, ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { PartnerStatusBadge } from '../ui/ProviderBadges';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../providers/SectionHeading';

// ─── S2.5 — The match showcase (canvas "Der Unterschied", 2026-08-25) ─────────
// The old partner preview under the Risk Map and MatchmakingDifference merge
// into ONE section — and the matches are finally ANONYMOUS, as stage 4
// promises: identity behind the lock, suitability in full view (specialty,
// coverage tags, match %, response time, rating, engagements). Names, places
// and initials are gone. MatchmakingDifference stays in the tree.
//
// The stage (Mercury card-grid reference): a FULL-BLEED band on the Gradient
// (CLAUDE.md: 165deg EAF3F1→DDECE8→E9E4D3) carrying three rows of washed-out
// ghost dossiers, each row looping endlessly — row 1 right→left, row 2
// left→right, row 3 right→left, very slowly (user spec). The three matched
// dossiers stand sharp and raised in the centre. Reduced motion freezes the
// rows via the global reduced-motion block in index.css.

// Match facts stay in code (fixture identity), copy in matchmaking.matches.*.
const MATCHES = [
  { index: 0, pct: 94, rating: '4.8' },
  { index: 1, pct: 88, rating: '4.9' },
  { index: 2, pct: 81, rating: '4.7' },
] as const;

// One washed-out dossier skeleton — same anatomy as the real card.
function GhostCard() {
  return (
    <div
      aria-hidden
      className="mr-[22px] flex h-[200px] w-[300px] shrink-0 flex-col gap-3 rounded-xl border border-white/70 bg-white/40 p-[18px]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-[34px] w-[34px] rounded-full bg-primary-500/[0.08]" />
          <div className="flex flex-col gap-1.5">
            <span className="h-[9px] w-[78px] rounded-[5px] bg-primary-500/10" />
            <span className="h-[9px] w-[52px] rounded-[5px] bg-primary-500/[0.07]" />
          </div>
        </div>
        <span className="h-5 w-[74px] rounded-full bg-accent-500/[0.22]" />
      </div>
      <span className="h-[9px] w-[150px] rounded-[5px] bg-primary-500/[0.09]" />
      <div className="flex gap-2">
        <span className="h-5 w-[86px] rounded-full bg-primary-500/[0.07]" />
        <span className="h-5 w-16 rounded-full bg-primary-500/[0.07]" />
      </div>
      <div className="flex flex-col gap-[7px] border-t border-white/70 pt-2.5">
        <span className="h-[9px] w-[110px] rounded-[5px] bg-primary-500/[0.12]" />
        <span className="h-[9px] w-[88px] rounded-[5px] bg-primary-500/[0.07]" />
      </div>
    </div>
  );
}

// An endless row: the track holds two identical halves, so translateX(-50%)
// is exactly one period (see the match-marquee keyframes in index.css).
function GhostRow({ reverse = false, duration }: { reverse?: boolean; duration: number }) {
  return (
    <div className="flex w-max" style={{ animation: `match-marquee ${duration}s linear infinite`, animationDirection: reverse ? 'reverse' : 'normal' }}>
      {[0, 1].map((half) => (
        <div key={half} className="flex">
          {Array.from({ length: 6 }, (_, i) => (
            <GhostCard key={i} />
          ))}
        </div>
      ))}
    </div>
  );
}

// The real dossier — anonymized: lock + skeleton where the identity sat.
function AnonMatchCard({ m }: { m: (typeof MATCHES)[number] }) {
  const { t } = useTranslation('home');
  const base = `matchmaking.matches.${m.index}`;
  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-stroke-subtle bg-surface px-5 py-4 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-secondary">
            <Lock size={15} className="text-fg-tertiary" />
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="h-2.5 w-24 rounded bg-neutral-300/70" />
            <span className="h-2.5 w-16 rounded bg-neutral-300/50" />
          </div>
        </div>
        <PartnerStatusBadge status="verified" styleVariant="solid" label={t('badge.verified')} />
      </div>
      <p className="mt-3 border-b border-stroke-subtle pb-2.5 text-body-xs text-fg-secondary">{t(`${base}.specialty`)}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {[0, 1].map((i) => (
          <Tag key={i} tone="neutral">{t(`${base}.tags.${i}`)}</Tag>
        ))}
      </div>
      <p className="mt-3 text-body font-bold text-fg-brand">{t('risk.match', { pct: m.pct })}</p>
      <p className="text-body-2xs text-fg-secondary">{t(`${base}.covers`)}</p>
      <p className="mt-auto flex items-center gap-1.5 border-t border-stroke-subtle pt-2.5 text-body-3xs text-fg-tertiary">
        {t(`${base}.response`)} · {m.rating} <Star size={10} className="-ml-0.5 fill-accent-500 text-accent-500" /> · {t(`${base}.engagements`)}
      </p>
    </div>
  );
}

export function MatchShowcase() {
  const { t } = useTranslation('home');

  return (
    <section id="matchmaking" className="bg-surface py-20 lg:py-24">
      <Container size="xl">
        <Reveal className="mx-auto flex max-w-[1000px] flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('matchmaking.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-[1.22] tracking-tight text-fg lg:text-[2.5rem]">
            <span className="lg:whitespace-nowrap">{t('matchmaking.title.line1')}</span>
            <br />
            <span className="lg:whitespace-nowrap">
              {t('matchmaking.title.pre')}
              <GoldWord>{t('matchmaking.title.gold')}</GoldWord>
              {t('matchmaking.title.post')}
            </span>
          </h2>
          <p className="max-w-[62ch] text-body-lg leading-relaxed text-fg-secondary">{t('matchmaking.subtitle')}</p>
        </Reveal>

      </Container>

      {/* Full-bleed stage: three endlessly drifting ghost rows behind, the
          three matched dossiers sharp in front. */}
      <div className="relative mt-12 overflow-hidden bg-[linear-gradient(165deg,#EAF3F1_0%,#DDECE8_55%,#E9E4D3_100%)]">
        <div aria-hidden className="absolute inset-0 flex flex-col justify-center gap-[22px]">
          <GhostRow duration={110} />
          <GhostRow reverse duration={130} />
          <GhostRow duration={120} />
        </div>
        <div className="relative px-4 py-24 md:px-6 lg:py-[120px]">
          <Stagger className="mx-auto grid max-w-[1140px] gap-5 md:grid-cols-3">
            {MATCHES.map((m) => (
              <StaggerItem key={m.index} className="flex">
                <AnonMatchCard m={m} />
              </StaggerItem>
            ))}
          </Stagger>

          {/* The one conversion of this section, inside the band below the
              dossiers — the band's symmetric padding keeps the space above
              the cards and below the button equal. */}
          <Reveal delay={0.1} className="mt-12 flex justify-center lg:mt-16">
            <Button size="lg">
              {t('riskMap.unlock')} <ArrowRight size={16} className="ml-1.5" />
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
