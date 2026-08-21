import { useTranslation } from 'react-i18next';
import { DomainsStep } from '../wizard-screens';

// Hero visual = the REAL full compliance wizard (Domains step) rendered in DARK,
// scaled into a framed window. Two forms: a scaled desktop window, or a phone frame.
// Replaces the earlier compact preview-card mock.

/** Desktop: the full 1200px-wide wizard screen scaled into a ~560px window. */
export function HeroWizardDesktop({ className = '' }: { className?: string }) {
  const W = 1200; // design width rendered
  const H = 760; // design height clipped to
  const scale = 0.4667; // → ~560 × ~355
  return (
    <div
      className={`dark overflow-hidden rounded-xl border border-stroke shadow-2xl ${className}`}
      style={{ width: W * scale, height: H * scale, maxWidth: '100%' }}
    >
      <div style={{ width: W, height: H, transformOrigin: 'top left', transform: `scale(${scale})` }}>
        <DomainsStep />
      </div>
    </div>
  );
}

/** Mobile: the real dark wizard captured as a PNG that scales with its container. */
export function HeroWizardMobile({ className = '' }: { className?: string }) {
  const { t } = useTranslation('home');
  return (
    <img
      src="/img/hero-wizard-mobile.png"
      alt={t('heroWizard.mobileAlt')}
      width={390}
      height={844}
      className={`block h-auto w-full max-w-[320px] rounded-[1.6rem] shadow-2xl ring-1 ring-black/10 ${className}`}
    />
  );
}
