import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { LoadFailedState } from '../../components/provider/WorkspaceStates';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { useRequestContext } from '../../lib/requestContext';
import { fetchVerification, type CoverageStatus, type MatrixRow } from '../../api/application';
import { fetchCoverage } from '../../api/provider';

// ─── Provider /coverage ───────────────────────────────────────────────────────
// TKT-PROV-12, Canvas-Wahl D1 (09.10.2026); Figma: Screens-Datei, Seite
// „Partner ohne Fixtures", 3628:1015.
//
// Ein lesender Spiegel der Freigabe: dieselbe Matrix Leistung × Land, die das
// Matching liest. Aenderungen laufen ueber Verifizierung → Leistungen & Laender
// (Change-Control). Bis TKT-PROV-12 war die ganze Seite Fixture (Maerkte
// DE/AT/NL/CH, Bereiche VAT/EPR/DAT, ein Rang-Banner), und „Markt hinzufuegen"
// schrieb an der Verifizierung vorbei direkt in `countries_supported`.

type CellView = { tone: 'success' | 'warning' | 'neutral'; key: 'approved' | 'underReview' | 'notRequested' } | null;

/** Abgelehnt, ausgesetzt oder abgelaufen steht als Strich — „nicht beantragt"
 *  waere dort falsch, und eine eigene Copy dafuer ist nicht abgenommen. */
export function cellView(status: CoverageStatus | undefined): CellView {
  if (!status) return { tone: 'neutral', key: 'notRequested' };
  if (status === 'approved' || status === 'limited') return { tone: 'success', key: 'approved' };
  if (status === 'pending') return { tone: 'warning', key: 'underReview' };
  return null;
}

export function CoveragePage() {
  const { t, i18n } = useTranslation('providerws');
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

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        {ver.state === 'loading' && <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {ver.state === 'error' && <LoadFailedState surface="coverage" error={ver.error} onRetry={ver.reload} />}
        {ver.state === 'ready' && (
          <>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-fg-brand">{t('shell.navCoverage')}</p>
              <h1 className="mt-1 font-serif text-[30px] font-bold leading-tight text-fg">{t('common:states.partner.coverage.heading')}</h1>
              <p className="mt-2 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('common:states.partner.coverage.message')}</p>
            </div>

            {rows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-stroke">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead className="bg-surface-secondary/60">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('application.chapter.services')}</th>
                      {countries.map((c) => (
                        <th key={c} scope="col" className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{markt(c)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.service_id} className="border-t border-stroke-subtle">
                        <th scope="row" className="px-5 py-3.5 text-[13px] font-normal text-fg">{r.service_name}</th>
                        {countries.map((c) => {
                          const v = cellView(r.cells.find((x) => x.country_code === c)?.status);
                          return (
                            <td key={c} className="px-5 py-3.5" data-cell={`${r.service_code}:${c}`}>
                              {v ? <Tag tone={v.tone}>{t(`common:states.partner.coverage.${v.key}`)}</Tag> : <span className="text-fg-tertiary">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {languages && (
                <p className="text-[13px] text-fg-secondary">
                  <span className="mr-2 font-medium text-fg">{t('common:states.partner.coverage.languages')}</span>{languages}
                </p>
              )}
              {profile.data?.sla_target_confirm_hours != null && (
                <p className="text-[13px] text-fg-secondary">
                  <span className="mr-2 font-medium text-fg">{t('common:states.partner.coverage.responseTime')}</span>
                  {t('common:states.partner.coverage.hours', { hours: profile.data.sla_target_confirm_hours })}
                </p>
              )}
              <Button size="sm" variant="secondary" className="ml-auto" onClick={() => navigate(`/${locale}/partner-dashboard/application`)}>
                {t('common:states.partner.coverage.submitChange')}
              </Button>
            </div>
          </>
        )}
      </div>
    </ProviderShell>
  );
}
