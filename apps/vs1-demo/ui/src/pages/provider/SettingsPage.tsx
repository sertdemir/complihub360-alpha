import { useEffect, useState } from 'react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDrawer, type ConfirmSpec } from '../../components/provider/ConfirmDrawer';
import { ChangeEmailDrawer } from '../../components/provider/ChangeEmailDrawer';
import { fetchCoverage } from '../../api/provider';

// ─── Provider /settings ───────────────────────────────────────────────────────
// Mirrors "Provider · /settings (Desktop)": settings section list (Profile
// active) + the Profile → Public-identity detail panel. Fixture data.

const SECTIONS = [
  { key: 'profile', title: 'Profile', sub: 'Public identity + bio' },
  { key: 'security', title: 'Security', sub: '2FA · password · sessions' },
  { key: 'notifications', title: 'Notifications', sub: 'Email + in-app preferences' },
  { key: 'integrations', title: 'Integrations', sub: 'Stripe · Cal.com' },
  { key: 'team', title: 'Team & Routing', sub: 'Coming WK3 · single-user v1' },
  { key: 'workspace', title: 'Workspace', sub: 'Plan · sign-out · delete' },
];

export function SettingsPage() {
  // B9: destructive workspace actions run through the Confirm drawer.
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [paused, setPaused] = useState(false);
  // B8: live contact address + change drawer (verify-first).
  const [emailOpen, setEmailOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('g.dahlmann@dahlmann-cpa.de');
  useEffect(() => {
    fetchCoverage().then((c) => { if ((c as { contact_email?: string }).contact_email) setContactEmail((c as { contact_email?: string }).contact_email!); }).catch(() => {});
  }, []);
  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">Settings</h1>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
            Workspace · profile · security · notifications · integrations · team. Changes apply within 60 seconds;
            sensitive changes trigger email confirmation.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
          <div className="space-y-2">
            {SECTIONS.map((s, i) => (
              <Card key={s.key} styleVariant={i === 0 ? 'outlined' : 'filled'} interactive selected={i === 0} className="px-4 py-3">
                <p className={i === 0 ? 'text-[13px] font-semibold text-fg-brand' : 'text-[13px] font-semibold text-fg'}>{s.title}</p>
                <p className="mt-0.5 text-[11px] text-fg-tertiary">{s.sub}</p>
              </Card>
            ))}
          </div>

          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">Public identity</h2>
                <p className="mt-0.5 text-[12px] text-fg-tertiary">How clients see you in search</p>
              </div>
              <a href="#" className="shrink-0 text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline">Preview</a>
            </div>

            <Card styleVariant="filled" className="flex items-center gap-4 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#d4af37] text-[13px] font-bold text-[#101411]">DC</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">Logo / avatar · 48×48</p>
                <p className="mt-0.5 text-[11px] text-fg-tertiary">PNG / SVG · square · min 256×256 · displayed at 48px in search</p>
              </div>
              <Button size="sm" variant="secondary">Replace</Button>
            </Card>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">Legal name</p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <p className="text-[14px] font-medium text-fg">Dahlmann CPA Steuerberatungs GmbH</p>
                <Tag tone="neutral">locked</Tag>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">Bio · 280 chars max · used in search results</p>
              <Card styleVariant="filled" className="mt-1.5 p-4">
                <p className="text-[13px] leading-relaxed text-fg-secondary">
                  Boutique Steuerberatungs-Praxis · Munich · 8 partners, 24 staff · specialist in cross-border
                  e-commerce VAT, EPR registrations, and German GoBD compliance audits for D2C + marketplace seller segment.
                </p>
              </Card>
            </div>

            <div className="space-y-2">
              <div>
                <h3 className="text-[14px] font-semibold text-fg">Contact email · routing-critical</h3>
                <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-fg-tertiary">
                  This is where new request magic-links arrive. If this email bounces, your visibility pauses until fixed (§11.2).
                </p>
              </div>
              <Card styleVariant="filled" className="flex items-center gap-3 p-4">
                <p className="text-[13px] font-medium text-fg">{contactEmail}</p>
                <Tag tone="success">✓ verified · no bounces 90d</Tag>
                <div className="ml-auto">
                  <Button size="sm" variant="secondary" onClick={() => setEmailOpen(true)}>Change email</Button>
                </div>
              </Card>
            </div>

            {/* B9: Workspace danger zone — every action guarded by ConfirmDrawer */}
            <div className="space-y-3">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">Workspace</h2>
                <p className="mt-0.5 text-[12px] text-fg-tertiary">Destructive actions — each asks for explicit confirmation</p>
              </div>
              {paused && (
                <Banner status="brand" title="New requests paused" action={<Button size="sm" variant="secondary" onClick={() => setPaused(false)}>Resume</Button>}>
                  Incoming requests are re-routed to other partners · your ranking is frozen while paused.
                </Banner>
              )}
              <Card styleVariant="filled" className="divide-y divide-white/5 p-0">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-fg">Pause new requests</p>
                    <p className="mt-0.5 text-[11px] text-fg-tertiary">Re-routes incoming requests · ranking frozen · resume anytime</p>
                  </div>
                  <Button size="sm" variant="secondary" disabled={paused}
                    onClick={() => setConfirm({
                      title: 'Pause new requests?',
                      consequence: 'Incoming requests will be re-routed to other partners while paused. Your ranking is frozen — it neither drops nor improves. You can resume anytime.',
                      confirmLabel: 'Pause requests',
                      onConfirm: () => setPaused(true),
                    })}>
                    {paused ? 'Paused' : 'Pause'}
                  </Button>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-error-500">Delete workspace</p>
                    <p className="mt-0.5 text-[11px] text-fg-tertiary">Removes your public profile + all data after a 30-day grace period</p>
                  </div>
                  <Button size="sm" variant="ghost"
                    onClick={() => setConfirm({
                      title: 'Delete workspace?',
                      consequence: 'Your public profile goes offline immediately. All engagement data is removed after a 30-day grace period — active engagements must be completed or handed over first. This cannot be undone after the grace period.',
                      confirmLabel: 'Delete workspace',
                      keyword: 'DELETE',
                      onConfirm: () => { /* deletion request lands with CS until provider auth (B8) */ },
                    })}>
                    Delete…
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDrawer spec={confirm} onClose={() => setConfirm(null)} />
      <ChangeEmailDrawer open={emailOpen} currentEmail={contactEmail} onClose={() => setEmailOpen(false)} />
    </ProviderShell>
  );
}
