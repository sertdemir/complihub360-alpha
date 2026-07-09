import { Check } from 'lucide-react';
import { UserShell } from '../../components/user/UserShell';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

// ─── User Dashboard · Coming Soon (Alerts / Calendar) ─────────────────────────
// Mirrors the "COMING IN WK3" pages (Alerts 2675:1020 / Calendar 2675:1359):
// accent banner + centered feature panel with gold CTA.

const PAGES = {
  alerts: {
    title: 'Alerts',
    sub: 'Threshold & regulatory monitoring · coming soon — join early access',
    panelTitle: 'Threshold & regulatory monitoring',
    panelSub: 'Get notified the moment your revenue approaches a VAT threshold, a regulator changes rules, or a deadline nears.',
    features: ['Per-country threshold alerts', 'Regulatory-change watch', 'Document-deadline reminders', 'Email + push + weekly digest'],
  },
  calendar: {
    title: 'Calendar',
    sub: 'Compliance deadlines & filing dates · coming soon',
    panelTitle: 'Your compliance calendar',
    panelSub: 'All your filing dates, deadlines and review cycles in one view — synced from your sessions and to your own calendar.',
    features: ['Filing & deadline timeline', 'Per-domain due dates', 'Sync to Google / Outlook', 'Reminders before each date'],
  },
} as const;

export function ComingSoonPage({ page }: { page: keyof typeof PAGES }) {
  const p = PAGES[page];
  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <span className="text-fg-accent">{p.title}</span>
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">{p.sub}</p>
        </div>

        <Banner
          status="accent"
          title={`COMING IN WK3 — ${p.panelTitle}`}
          action={<Button size="sm" variant="accent">Join early access</Button>}
        >
          {p.panelSub}
        </Banner>

        <div className="flex justify-center pt-4">
          <Card styleVariant="filled" className="w-full max-w-md p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#14a89a]/15 text-fg-brand">◔</span>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-brand">Coming in WK3</p>
            <h2 className="mt-1 text-[18px] font-semibold text-fg">{p.panelTitle}</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-secondary">{p.panelSub}</p>
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="accent">Join early access</Button>
            </div>
            <ul className="mx-auto mt-5 max-w-[280px] space-y-1.5 text-left">
              {p.features.map((f) => (
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
