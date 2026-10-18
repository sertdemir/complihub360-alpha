import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { LoadFailedState, ReadinessEmpty } from '../../components/provider/WorkspaceStates';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Fact } from '../../components/ui/Fact';
import { SectionHead } from '../../components/ui/SectionHead';
import { Tag } from '../../components/ui/Tag';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { useRequestContext } from '../../lib/requestContext';
import { fetchVerification, type CoverageStatus, type MatrixRow } from '../../api/application';
import { fetchCoverage } from '../../api/provider';

// ─── Provider /coverage ───────────────────────────────────────────────────────
// TKT-PROV-12, Canvas-Wahl D1 (09.10.2026); Angleich an das User-Dashboard
// (Canvas A1–A8, 18.10.2026): Figma Screens-Datei, Seite „Provider · Abdeckung
// (So 18.10.)" — Light 3803:436, Dark 3804:137, Zustaende 3804:529.
//
// Ein lesender Spiegel der Freigabe: dieselbe Matrix Leistung × Land, die das
// Matching liest, als Workspace-Karte mit Kopf (Titel · Zaehler · der eine Weg
// „Aenderung einreichen"), Spaltenkopf und Hinweis als Baender. Darunter die
// Karte „Fuer das Matching" mit den Fakten, die Unternehmen in den Ergebnissen
// sehen. Aenderungen laufen ueber Verifizierung → Leistungen & Laender
// (Change-Control). Kein Rang, kein Score, keine Expansions-Hinweise (ADR-0009).
// Bis TKT-PROV-12 war die ganze Seite Fixture, und „Markt hinzufuegen" schrieb
// an der Verifizierung vorbei direkt in `countries_supported`.

type CellView = { tone: 'success' | 'warning' | 'neutral'; key: 'approved' | 'underReview' | 'notRequested' } | null;

const BAND = 'border-t border-stroke-subtle bg-elevate/[0.03]';
const TH = 'px-5 py-[11px] text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary';

/** Abgelehnt, ausgesetzt oder abgelaufen steht als Strich — „nicht beantragt"
 *  waere dort falsch, und eine eigene Copy dafuer ist nicht abgenommen. */
export function cellView(status: CoverageStatus | undefined): CellView {
  if (!status) return { tone: 'neutral', key: 'notRequested' };
  if (status === 'approved' || status === 'limited') return { tone: 'success', key: 'approved' };
  if (status === 'pending') return { tone: 'warning', key: 'underReview' };
  return null;
}

export function CoveragePage() {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const { markt } = useRequestContext();
  const ver = useWorkspaceData(fetchVerification);
  const profile = useWorkspaceData(fetchCoverage);

  const rows: MatrixRow[] = ver.data?.matrix ?? [];
  const countries = useMemo(
    () => [...new Set(rows.flatMap((r) => r.cells.map((c) => c.country_code)))].sort(),
    [rows],
  );
  const languageName = useMemo(() => {
    try { return new Intl.DisplayNames([locale], { type: 'language' }); } catch { return null; }
  }, [locale]);
  const languages = (profile.data?.languages ?? [])
    .map((l) => { try { return languageName?.of(l.toLowerCase()) ?? l; } catch { return l; } })
    .join(', ');
  const toApplication = () => navigate(`/${locale}/provider-dashboard/application`);

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        {ver.state === 'loading' && <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {ver.state === 'error' && <LoadFailedState surface="coverage" error={ver.error} onRetry={ver.reload} />}
        {ver.state === 'ready' && (
          <>
            <div>
              <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
                <Trans t={t} i18nKey="states.partner.coverage.heading" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
              </h1>
              <p className="mt-2 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('states.partner.coverage.message')}</p>
            </div>

            {rows.length === 0 ? (
              <ReadinessEmpty kind="coverage" items={null} />
            ) : (
              <Card styleVariant="workspace" className="overflow-hidden" data-section="matrix">
                <SectionHead
                  className="mb-0 px-6 pb-4 pt-[18px]"
                  title={t('states.partner.coverage.matrixTitle')}
                  count={`${t('states.partner.coverage.services', { count: rows.length })} · ${t('states.partner.coverage.countries', { count: countries.length })}`}
                  trailing={<Button size="sm" variant="outline" onClick={toApplication}>{t('states.partner.coverage.submitChange')}</Button>}
                />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead className={BAND}>
                      <tr>
                        <th scope="col" className={TH + ' pl-6'}>{t('states.partner.coverage.service')}</th>
                        {countries.map((c) => (
                          <th key={c} scope="col" className={TH}>{markt(c)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.service_id} className="border-t border-stroke-subtle">
                          <th scope="row" className="py-3.5 pl-6 pr-5 text-[13px] font-normal text-fg">{r.service_name}</th>
                          {countries.map((c) => {
                            const v = cellView(r.cells.find((x) => x.country_code === c)?.status);
                            return (
                              <td key={c} className="px-5 py-3.5" data-cell={`${r.service_code}:${c}`}>
                                {v ? <Tag tone={v.tone}>{t(`states.partner.coverage.${v.key}`)}</Tag> : <span className="text-fg-tertiary">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={`${BAND} max-w-none px-6 py-3 text-[11px] leading-snug text-fg-tertiary`}>{t('states.partner.coverage.matrixHint')}</p>
              </Card>
            )}

            {profile.data && (
              <Card styleVariant="workspace" className="px-6 pb-2 pt-5" data-section="matching">
                <SectionHead
                  className="mb-1"
                  title={t('states.partner.coverage.matchingTitle')}
                  extra={<span className="text-[11px] text-fg-tertiary">{t('states.partner.coverage.matchingSub')}</span>}
                />
                <dl className="text-[13px]">
                  {languages && (
                    <Fact label={t('states.partner.coverage.languages')}>
                      <span className="font-semibold text-fg">{languages}</span>
                    </Fact>
                  )}
                  {profile.data.sla_target_confirm_hours != null && (
                    <Fact label={t('states.partner.coverage.responseTime')}>
                      <span className="font-semibold text-fg">{t('states.partner.coverage.hours', { hours: profile.data.sla_target_confirm_hours })}</span>
                    </Fact>
                  )}
                  {profile.data.availability && (
                    <Fact label={t('states.partner.coverage.availability')}>
                      <span className="font-semibold text-fg">{profile.data.availability === 'ooo' ? t('states.partner.coverage.ooo') : t('states.partner.coverage.available')}</span>
                    </Fact>
                  )}
                </dl>
              </Card>
            )}
          </>
        )}
      </div>
    </ProviderShell>
  );
}
