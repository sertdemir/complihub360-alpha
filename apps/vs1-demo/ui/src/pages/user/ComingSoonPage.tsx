import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

// ─── User Dashboard · Coming Soon (Alerts / Calendar) ─────────────────────────
// Mirrors the "COMING IN WK3" pages (Alerts 2675:1020 / Calendar 2675:1359):
// accent banner + centered feature panel with gold CTA. Copy lives in the
// 'userws' namespace under comingSoon.{alerts,calendar}.*.

const PAGES = { alerts: 'alerts', calendar: 'calendar' } as const;

export function ComingSoonPage({ page }: { page: keyof typeof PAGES }) {
  const { t } = useTranslation('userws');
  const k = `comingSoon.${page}`;
  const features = [1, 2, 3, 4].map((n) => t(`${k}.feature${n}`));
  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <span className="text-fg-accent">{t(`${k}.title`)}</span>
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">{t(`${k}.sub`)}</p>
        </div>

        <Banner
          status="accent"
          title={t('comingSoon.bannerTitle', { title: t(`${k}.panelTitle`) })}
          action={<Button size="sm" variant="accent">{t('comingSoon.joinEarlyAccess')}</Button>}
        >
          {t(`${k}.panelSub`)}
        </Banner>

        <div className="flex justify-center pt-4">
          <Card styleVariant="filled" className="w-full max-w-md p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-fg-brand">◔</span>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-brand">{t('comingSoon.eyebrow')}</p>
            <h2 className="mt-1 text-[18px] font-semibold text-fg">{t(`${k}.panelTitle`)}</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-secondary">{t(`${k}.panelSub`)}</p>
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="accent">{t('comingSoon.joinEarlyAccess')}</Button>
            </div>
            <ul className="mx-auto mt-5 max-w-[280px] space-y-1.5 text-left">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12px] text-fg-secondary">
                  <Check size={13} className="shrink-0 text-fg-brand" /> {f}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </UserShell>
  );
}
