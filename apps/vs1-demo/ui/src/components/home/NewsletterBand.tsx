import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check } from 'lucide-react';
import { FreeAccountDrawer } from './MarketsDrawer';

// ─── S10 — Newsletter band · Figma 1212:11 (compact variant) ────────────────
// A slim band: copy on the left, email + Subscribe on the right. Below it, the
// privacy line and a text link that opens the free-account drawer (same
// mechanism as the wizard's "Save progress").

export function NewsletterBand() {
  const { t } = useTranslation('home');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const valid = /.+@.+\..+/.test(email);

  return (
    <section id="newsletter" className="bg-surface-secondary py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1080px] px-4 md:px-6 lg:px-10">
        <div className="flex flex-col gap-6 rounded-2xl border border-stroke-subtle bg-surface px-7 py-6 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.3)] lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-9">
          {/* Left — copy */}
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-brand">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {t('newsletter.eyebrow')}
            </span>
            <h2 className="mt-2 font-serif text-[1.6rem] font-bold leading-tight tracking-tight text-fg">
              {t('newsletter.title')}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-secondary">
              {t('newsletter.desc')}
            </p>
          </div>

          {/* Right — email + Subscribe */}
          {subscribed ? (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-stroke-subtle bg-surface-secondary px-4 py-3 text-[14px] font-semibold text-fg-brand lg:w-[380px]">
              <Check size={16} strokeWidth={2.5} /> {t('newsletter.success')}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (valid) setSubscribed(true);
              }}
              className="flex w-full shrink-0 gap-2 lg:w-[380px]"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter.placeholder')}
                aria-label={t('newsletter.emailAria')}
                className="min-w-0 flex-1 rounded-xl border border-stroke px-4 py-3 text-[15px] text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-brand"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5"
              >
                {t('newsletter.subscribe')}
              </button>
            </form>
          )}
        </div>

        {/* Below — privacy line + free-account link */}
        <div className="mt-3 flex flex-col items-start gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-fg-tertiary">
            {t('newsletter.privacy')}
          </p>
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg-brand transition-colors hover:text-brand"
          >
            {t('newsletter.accountLink')} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <FreeAccountDrawer open={accountOpen} onClose={() => setAccountOpen(false)} />
    </section>
  );
}
