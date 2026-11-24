import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Send } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { KPICard } from '../../components/ui/Cards';
import { Card } from '../../components/ui/Card';
import { Badge, FilterChip, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ApiError } from '../../api/client';
import { fetchApplications, inviteApplication, type ApplicationList, type ApplicationStatus, type ProviderApplication } from '../../api/providerInvites';

// ─── Admin · Bewerbungen (P01, Entscheidung der Mitgruenderin 24.11.2026) ────
// Jede Bewerbung von /provider-apply mit allen Angaben des Formulars. Die
// erste Sichtung macht ein Mensch; "Invite to onboarding" verschickt die Mail
// mit dem Link dieser Bewerbung, der Zeitpunkt steht danach in der Zeile.
// "Invited" ist nicht "verified": die Pruefung laeuft danach in der Review
// Queue. Wie die anderen Admin-Seiten bleibt die Oberflaeche englisch.

const STATUS: Record<ApplicationStatus, { label: string; tone: BadgeTone }> = {
  received: { label: 'New', tone: 'warning' },
  invited: { label: 'Invited to onboarding', tone: 'info' },
  onboarding: { label: 'Account set up', tone: 'success' },
};
const FILTERS: Array<{ key: 'all' | ApplicationStatus; label: string }> = [
  { key: 'received', label: 'New' }, { key: 'invited', label: 'Invited' }, { key: 'onboarding', label: 'Account set up' }, { key: 'all', label: 'All' },
];

const stamp = (iso: string | null, locale: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const day = (iso: string | null, locale: string) => (iso ? new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

function failureText(err: unknown): string {
  const code = err instanceof ApiError ? err.body.errorCode : undefined;
  if (code === 'MAIL_UNAVAILABLE') return 'Mail delivery is not configured here. No invitation was sent.';
  if (code === 'INVITE_SEND_FAILED') return 'The invitation could not be sent. Nothing was changed; you can try again.';
  if (code === 'ALREADY_ONBOARDING') return 'This invitation was already used. The provider has an account.';
  return 'The invitation did not go through. Nothing was changed.';
}

export function AdminApplicationsPage() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const [list, setList] = useState<ApplicationList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('received');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const load = () => fetchApplications().then(setList).catch(() => setError('Applications could not be loaded. The API answers 403 without an admin login.'));
  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => (list?.applications ?? []).filter((a) => filter === 'all' || a.status === filter), [list, filter]);
  const count = (k: 'all' | ApplicationStatus) => (list?.applications ?? []).filter((a) => k === 'all' || a.status === k).length;

  const invite = async (a: ProviderApplication) => {
    setBusy(a.id);
    setNotice(null);
    try {
      const next = await inviteApplication(a.id);
      setList((cur) => {
        if (!cur) return cur;
        const applications = cur.applications.map((x) => (x.id === next.id ? next : x));
        const n = (s: ApplicationStatus) => applications.filter((x) => x.status === s).length;
        return { applications, counts: { total: applications.length, received: n('received'), invited: n('invited'), onboarding: n('onboarding') } };
      });
      setNotice({ ok: true, text: `Invitation sent to ${next.email} on ${stamp(next.invited_at, locale)}. The link is valid until ${day(next.invite_expires_at, locale)}.` });
    } catch (err) {
      setNotice({ ok: false, text: `${a.firm}: ${failureText(err)}` });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-fg">Provider <span className="text-fg-accent-emphasis">Applications</span></h1>
          <p className="mt-1 max-w-[720px] text-[13px] text-fg-secondary">Every application from the provider form, with everything the applicant entered. Inviting sends a link that belongs to this application. Invited does not mean verified: verification starts once the provider submits details and documents.</p>
        </div>
        {error && <Banner status="warning" title={error} />}
        {notice && <Banner status={notice.ok ? 'success' : 'warning'} title={notice.text} />}
        {!list && !error && <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} variant="rect" height={100} />)}</div>}
        {list && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <KPICard label="New, not yet reviewed" value={list.counts.received} />
              <KPICard label="Invited, account pending" value={list.counts.invited} />
              <KPICard label="Account set up" value={list.counts.onboarding} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => <FilterChip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>{f.label} · {count(f.key)}</FilterChip>)}
            </div>
            <Card styleVariant="outlined" className="overflow-hidden p-0">
              {rows.length === 0 ? <EmptyState size="compact" title="Nothing in this view" description="No application matches the filter." /> : (
                <table className="w-full text-[13px]">
                  <thead className="bg-surface-secondary text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
                    <tr>{['', 'Firm', 'Areas · markets', 'Received', 'Status', 'Invitation', ''].map((h, i) => <th key={i} className="px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => {
                      const isOpen = open === a.id;
                      const st = STATUS[a.status];
                      return (
                        <Fragment key={a.id}>
                          <tr className="border-t border-stroke-subtle align-top" data-application={a.id} data-status={a.status}>
                            <td className="py-3 pl-4">
                              <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${a.firm}`} onClick={() => setOpen(isOpen ? null : a.id)} className="grid h-7 w-7 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg">
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            </td>
                            <td className="px-4 py-3"><p className="font-medium text-fg">{a.firm}</p><p className="text-[12px] text-fg-tertiary">{a.contact_name} · {a.email}</p></td>
                            <td className="px-4 py-3 text-fg-secondary">{a.areas.join(', ') || '—'}<span className="block text-[12px] text-fg-tertiary">{a.markets.join(', ') || '—'}</span></td>
                            <td className="px-4 py-3 text-fg-secondary">{stamp(a.created_at, locale)}</td>
                            <td className="px-4 py-3"><Badge tone={st.tone} size="sm">{st.label}</Badge></td>
                            <td className="px-4 py-3 text-fg-secondary">
                              {a.invited_at ? (
                                <>
                                  <span data-invited-at>Sent {stamp(a.invited_at, locale)}</span>
                                  <span className={'block text-[12px] ' + (a.invite_expired ? 'font-semibold text-warning-800 dark:text-amber-200' : 'text-fg-tertiary')}>
                                    {a.status === 'onboarding' ? `Used ${stamp(a.redeemed_at, locale)}` : a.invite_expired ? `Link expired ${day(a.invite_expires_at, locale)}` : `Valid until ${day(a.invite_expires_at, locale)}`}
                                    {a.invite_send_count > 1 ? ` · sent ${a.invite_send_count} times` : ''}
                                  </span>
                                </>
                              ) : 'Not sent'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {a.status === 'received' && <Button size="sm" variant="primary" loading={busy === a.id} onClick={() => void invite(a)}><Send size={14} />Invite to onboarding</Button>}
                              {a.status === 'invited' && <Button size="sm" variant="secondary" loading={busy === a.id} onClick={() => void invite(a)}>Send again</Button>}
                              {a.status === 'onboarding' && a.provider_key && <Link to={`/${locale}/admin/providers/${a.provider_key}`}><Button size="sm" variant="secondary">Open dossier</Button></Link>}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-t border-stroke-subtle bg-surface-secondary/50">
                              <td />
                              <td colSpan={6} className="px-4 py-4">
                                <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                                  <Fact label="Contact person" value={a.contact_name} />
                                  <Fact label="Email" value={a.email} />
                                  <Fact label="Website" value={a.website} />
                                  <Fact label="Form language" value={a.locale.toUpperCase()} />
                                  <Fact label="Licence / qualification" value={a.credentials} wide />
                                  <Fact label="Message" value={a.message} wide />
                                  <Fact label="Areas" value={a.areas.join(', ')} />
                                  <Fact label="Markets" value={a.markets.join(', ')} />
                                  <Fact label="Reference" value={a.reference} />
                                </dl>
                                {a.status === 'invited' && <p className="mt-3 text-[12px] text-fg-tertiary">Sending again creates a new link. The earlier link stops working.</p>}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div className="flex items-center justify-between border-t border-stroke-subtle px-4 py-3 text-[12px] text-fg-tertiary">
                <span>Newest first. After the account is set up, the provider continues under Providers in the review queue.</span>
                <span>{rows.length} applications</span>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Fact({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-[13px] text-fg">{value || '—'}</dd>
    </div>
  );
}
