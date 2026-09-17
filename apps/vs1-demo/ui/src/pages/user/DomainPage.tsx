import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { useWizardDrawer } from '../../components/user/WizardDrawer';
import { Button } from '../../components/ui/Button';
import { KpiRing, useEntered } from '../../components/ui/Stats';
import { DomainAssistant } from '../../components/user/DomainAssistant';
import { DomainKnowledge } from '../../components/user/DomainKnowledge';
import { DomainProviders } from '../../components/user/DomainProviders';
import { AREA_BY_SLUG } from '../../components/compliance-areas/areas';
import { SEVERITY_STYLE } from '../../components/compliance-areas/severity';
import { fetchDomainOverview, EMPTY_DOMAIN, type DomainObligation, type DomainOverview, type DomainSession } from '../../api/domain';
import { isAreaSlug } from '../../lib/areaProfiles';
import { useObligationText } from '../../lib/obligationText';
import { DOMAINS, type DomainSlug } from '../../lib/domains';
import { SLUG_TO_I18N } from './AnfragenTab';

// ─── User Dashboard · Bereichsseite ──────────────────────────────────────────
// Canvas "Bereichsseite", Nutzer-Wahl 2026-09-13 (1B · 2C · 3C · 4B · 5D · 6B).
// Festlegung 2026-09-09: ein Bereich ist fuer den Dashboard-Nutzer der
// QUERSCHNITT ueber alle seine Sitzungen, dazu der Wissens-Hub und die Frage,
// die nur ueber diesen Bereich und seine Sitzungen antwortet.
//   1B  Kopf mit Bereichs-Icon, Titel, Lage-Satz aus den Sitzungen ("7 offene
//       Pflichten in 2 Sitzungen · 5 mit hohem Risiko · DE · IT · ES · naechste
//       Frist in 6 Tagen"); rechts nur "Neue Suche starten" (der Assistent
//       steht als Karte daneben, ein "Frage stellen"-Knopf waere doppelt);
//       drei Kennzahl-Ringe wie Dashboard und Sitzungen.
//   2C  MATRIX Pflicht × Markt: Zeilen = offene Pflichten des Bereichs aus
//       allen Sitzungen, Spalten = Maerkte des Nutzers, in der Zelle ein Punkt
//       in Risikofarbe (Tooltip: Sitzung, Frist), rechts die Sitzung. Eine
//       Pflicht, die in zwei Sitzungen liegt, steht zweimal — je Sitzung ein
//       eigener Stand.
//   3C  Assistent als klebende Karte RECHTS neben dem Inhalt (DomainAssistant,
//       Nutzer-Aenderung 2026-09-13 statt 3B): zweispaltig ab lg, Kopf und
//       Ringe bleiben ueber beiden Spalten.
//   4B  Pflichten-Explorer im Arbeitsbereich (DomainKnowledge).
//   5D  Anbieter als Karten — dieselbe PartnerCard wie die Sitzungsseite, nur
//       „Details ansehen" (DomainProviders).
//   6B  Leerzustand ohne Sitzung: Leerkarte mit vorbelegtem Wizard; Wissen,
//       Frage und Anbieter bleiben — sie brauchen keine Sitzung.
//
// Was die Seite vorher war (WorkbenchPage): eine Fixture fuer alle acht
// Bereiche — 82 · 85 % · 280 k€, englische Schritte, Schwellenwerte ohne
// Umsatzdaten, drei Anbieter mit Klarnamen-Initialen. Nichts davon kam aus
// den Sitzungen des Nutzers.
//
// Daten: /api/v1/domain/:slug (Pflichten je Sitzung, serverseitig durch die
// Engine gerechnet; 401 ohne Anmeldung → Leerzustand). Das Wissen kommt aus
// der Engine im Browser (lib/areaProfiles), die Anbieter aus /search.

type OpenDuty = { o: DomainObligation; session: DomainSession };

const RANG: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function DomainPage() {
  const { domain: slugParam = '', locale = 'en' } = useParams();
  if (!isAreaSlug(slugParam)) return <Navigate to={`/${locale}/dashboard`} replace />;
  return <DomainView slug={slugParam} />;
}

function DomainView({ slug }: { slug: DomainSlug }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  // Die Engine nennt ihre Pflichten englisch ("VAT Registration & Filing").
  // Matrix und Wissenskarten ziehen denselben Namen aus derselben Quelle
  // (Befund 2026-09-16: zwei Vokabulare fuer dieselbe Pflicht).
  const obText = useObligationText();
  const { openWizard } = useWizardDrawer();
  const locale = i18n.resolvedLanguage || 'en';
  const entered = useEntered();
  const [data, setData] = useState<DomainOverview | null>(null);
  const askRef = useRef<HTMLTextAreaElement>(null);
  const providersRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    fetchDomainOverview(slug)
      // Nur die Antwort des aktuellen Bereichs zaehlt — bei schnellem Klicken
      // durch die Navigation darf eine spaete Antwort den neuen nicht ueberschreiben.
      .then((d) => { if (alive) setData(d); })
      // 401 (Gast) oder Ausfall: der Leerzustand, kein Dauerladen
      // (Waechter-Test emptyState.guard: null = laedt, EMPTY_ = nichts da).
      .catch(() => { if (alive) setData(EMPTY_DOMAIN); });
    return () => { alive = false; };
  }, [slug]);

  const areaLabel = t(`domain.${SLUG_TO_I18N[slug]}`);
  const domainLabel = DOMAINS.find((d) => d.slug === slug)?.label ?? slug;
  const Icon = AREA_BY_SLUG[slug].icon;
  const sessions = data?.sessions ?? [];
  const sessionTitle = (s: DomainSession) =>
    s.label || [s.categories.map((c) => (SLUG_TO_I18N[c] ? t(`domain.${SLUG_TO_I18N[c]}`) : c)).join(', '), s.country].filter(Boolean).join(' · ') || '—';
  const sessionMarkets = (s: DomainSession) => [...new Set([s.country, ...s.markets].filter((m): m is string => !!m).map((m) => m.toUpperCase()))];

  // Offene Pflichten ueber alle Sitzungen — angefangen zaehlt als offen.
  const open: OpenDuty[] = sessions
    .flatMap((s) => s.obligations.filter((o) => o.status === 'open' || o.status === 'in_progress').map((o) => ({ o, session: s })))
    .sort((a, b) => RANG[b.o.severity] - RANG[a.o.severity] || (a.o.dueDays ?? 9999) - (b.o.dueDays ?? 9999));
  const markets = [...new Set(sessions.flatMap(sessionMarkets))];
  const bySev = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const d of open) bySev[d.o.severity] += 1;
  const high = bySev.critical + bySev.high;
  const nextDue = data?.next_due_days ?? null;
  const primaryCountry = sessions[0]?.country?.toUpperCase() ?? 'DE';
  const empty = data !== null && sessions.length === 0;

  const dueLabel = (o: DomainObligation) =>
    o.status === 'in_progress' ? t('domainPage.inProgress')
    : typeof o.dueDays === 'number' ? t('domainPage.dueInDays', { count: o.dueDays })
    : (o.due || t('domainPage.noDue'));
  const scrollProviders = () => providersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Titel: das letzte Wort in Gold, wie "Ihre Compliance-Sitzungen."
  const words = areaLabel.split(' ');
  const title = words.length > 1
    ? <>{words.slice(0, -1).join(' ')} <span className="text-fg-accent-emphasis">{words[words.length - 1]}</span></>
    : <>{areaLabel}<span className="text-fg-accent-emphasis">.</span></>;

  // 1B: der Lage-Satz — nur Teile, die es gibt.
  const lage: ReactNode[] = [];
  if (data && !empty) {
    lage.push(<span key="o">{t('domainPage.lageOpen', { count: open.length })} {t('domainPage.lageSessions', { count: sessions.length })}</span>);
    if (high > 0) lage.push(<strong key="h" className="text-[#8A3B3B] dark:text-[#F1A88C]">{t('domainPage.lageHigh', { count: high })}</strong>);
    if (markets.length) lage.push(<span key="m">{markets.join(' · ')}</span>);
    if (nextDue !== null) lage.push(<strong key="d" className="text-fg-accent-strong">{nextDue <= 0 ? t('domainPage.lageNextDueToday') : t('domainPage.lageNextDue', { count: nextDue })}</strong>);
  }

  return (
    <UserShell activeDomain={domainLabel}>
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <div className="mx-auto max-w-[1240px]">
          {/* 1B · Kopf */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex min-w-0 items-start gap-3.5">
              {/* Icon frei, ohne Kasten — so gross wie der Kasten vorher (40 px);
                  duennerer Strich, sonst wirkt es bei dieser Groesse klobig. */}
              <span className="shrink-0 text-fg-brand">
                <Icon size={40} strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className="font-serif text-[23px] font-bold leading-tight text-fg">{title}</h1>
                {data === null ? (
                  <p className="mt-1.5 text-body-sm text-fg-tertiary">{t('shared.loading')}</p>
                ) : empty ? (
                  <p className="mt-1.5 text-body-sm text-fg-tertiary">{t('domainPage.subEmpty')}</p>
                ) : (
                  <p className="mt-1.5 text-body-sm text-fg">
                    {lage.map((part, i) => (
                      <span key={i}>{i > 0 && <span className="text-fg-tertiary"> · </span>}{part}</span>
                    ))}
                  </p>
                )}
              </div>
            </div>
            {/* Kein "Frage stellen" mehr im Kopf (Nutzer 2026-09-13): der Assistent
                steht als Karte rechts daneben, der Knopf war doppelt. */}
            {/* Erst wenn die Daten da sind: waehrend des Ladens ist `empty` noch
                false, der Knopf blitzte beim Bereichswechsel kurz auf. */}
            {data && !empty && (
              <div className="mt-0.5 flex shrink-0 items-center">
                <Button onClick={() => openWizard()}>{t('shared.startNewSearch')}</Button>
              </div>
            )}
          </div>

          {/* Kennzahl-Ringe wie Dashboard und Sitzungen: ohne Karte, Zahl nur im Kreis. */}
          {data && !empty && (
            <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-3">
              <KpiRing
                on={entered}
                title={t('domainPage.kpiOpen')}
                value={open.length}
                sub={t('domainPage.kpiOpenSub', { count: sessions.length })}
                segs={open.length ? [
                  { frac: high / open.length, cls: 'text-risk-high' },
                  { frac: bySev.medium / open.length, cls: 'text-risk-medium' },
                  { frac: bySev.low / open.length, cls: 'text-risk-low' },
                ] : []}
              />
              <KpiRing
                on={entered}
                title={t('domainPage.kpiHigh')}
                value={high}
                sub={t('domainPage.kpiHighSub', { critical: bySev.critical, high: bySev.high })}
                segs={open.length ? [{ frac: high / open.length, cls: 'text-risk-high' }] : []}
              />
              <KpiRing
                on={entered}
                title={t('domainPage.kpiMarkets')}
                value={markets.length}
                sub={markets.join(' · ') || '—'}
                segs={markets.length ? [{ frac: 1, cls: 'text-brand' }] : []}
              />
            </div>
          )}

          {/* Zweispaltig (3C): links Leerkarte/Matrix, Wissen, Anbieter — rechts
              der Assistent, der beim Scrollen stehen bleibt. */}
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {/* 6B · Leerzustand: eine Karte, der Rest der Seite bleibt. */}
              {empty && (
                <div className="flex items-center gap-7 rounded-xl border border-stroke-subtle bg-surface px-8 py-7 shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]">
                  {/* Icon frei, so gross wie der Kasten vorher (56 px). */}
                  <span className="shrink-0 text-fg-brand">
                    <Icon size={56} strokeWidth={1.25} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[18px] font-bold leading-tight text-fg">{t('domainPage.emptyTitle', { area: areaLabel })}</p>
                    <p className="mt-1.5 max-w-[640px] text-body-xs leading-relaxed text-fg-secondary">{t('domainPage.emptyBody')}</p>
                    <p className="mt-2 text-body-3xs text-fg-tertiary">
                      {t('domainPage.emptyHint')}
                      {(data?.archived ?? 0) > 0 && (
                        <>
                          {' · '}{t('domainPage.emptyArchived', { count: data?.archived ?? 0 })}{' · '}
                          <Link to={`/${locale}/dashboard/sessions`} className="font-bold text-brand underline underline-offset-2 hover:text-brand-700">{t('domainPage.emptyArchivedLink')}</Link>
                        </>
                      )}
                    </p>
                  </div>
                  <Button className="shrink-0" onClick={() => openWizard({ categories: [slug] })}>{t('domainPage.emptyCta')}</Button>
                </div>
              )}

              {/* 2C · Matrix Pflicht × Markt */}
              {data && !empty && (
                <section className="mt-0">
                  <h2 className="mb-3 text-body-md font-bold text-fg">
                    {t('domainPage.matrixTitle')} <span className="text-fg-brand">{open.length}</span>
                  </h2>
                  <div className="overflow-x-auto rounded-xl border border-stroke-subtle bg-surface px-[18px] py-3.5 shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]">
                    <div className="min-w-[640px]">
                      <div
                        className="grid items-center gap-2 border-b border-stroke-subtle pb-2"
                        style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${markets.length}, 56px) 170px` }}
                      >
                        <span />
                        {markets.map((m) => <span key={m} className="text-center text-[10px] font-extrabold text-fg-secondary">{m}</span>)}
                        <span className="text-[10px] font-extrabold text-fg-secondary">{t('domainPage.matrixSession')}</span>
                      </div>
                      {open.length === 0 && (
                        <p className="py-4 text-body-xs text-fg-tertiary">{t('domainPage.matrixNone')}</p>
                      )}
                      {open.map(({ o, session }, i) => {
                        const own = sessionMarkets(session);
                        const euWide = o.markets.length === 0;
                        const applies = (m: string) => (euWide ? own.includes(m) : o.markets.map((x) => x.toUpperCase()).includes(m));
                        const tip = t('domainPage.matrixTooltip', { session: sessionTitle(session), due: dueLabel(o) });
                        return (
                          <div
                            key={`${session.id}:${o.id}`}
                            role="button"
                            tabIndex={0}
                            title={tip}
                            onClick={() => navigate(`/${locale}/results?session=${session.id}`)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/${locale}/results?session=${session.id}`); } }}
                            className={'grid cursor-pointer items-center gap-2 py-2.5 transition-colors hover:bg-surface-secondary/60 ' + (i < open.length - 1 ? 'border-b border-stroke-subtle' : '')}
                            style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${markets.length}, 56px) 170px` }}
                          >
                            <span className="min-w-0 truncate text-body-xs font-bold text-fg">
                              {obText.label(o.id, o.label)}
                              {euWide && <span className="ml-1.5 text-[10px] font-semibold text-fg-tertiary">{t('domainPage.matrixEuWide')}</span>}
                              {o.status === 'in_progress' && <span className="ml-1.5 text-[10px] font-semibold text-risk-medium">{t('domainPage.inProgress')}</span>}
                            </span>
                            {markets.map((m) => (
                              <span key={m} className="grid place-items-center">
                                {applies(m)
                                  ? <span className={`h-3 w-3 rounded-full ${SEVERITY_STYLE[o.severity].bar}`} />
                                  : <span className="h-3 w-3 rounded-full border border-stroke" />}
                              </span>
                            ))}
                            <span className="truncate text-body-3xs text-fg-secondary">{sessionTitle(session)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* 4B · Wissen zum Bereich */}
              {data && <DomainKnowledge slug={slug} markets={markets} sessions={sessions} />}

            </div>

            {/* 3C · Assistent rechts */}
            {data && (
              <DomainAssistant
                slug={slug}
                areaLabel={areaLabel}
                sessions={sessions}
                markets={markets}
                openDuties={open.map((d) => d.o)}
                inputRef={askRef}
                onPartner={scrollProviders}
              />
            )}
          </div>

          {/* 5D · Anbieter als Karten — ueber die VOLLE Breite, nicht in der
              linken Spalte (Nutzer 2026-09-15: drei nebeneinander, kein
              Umbruch). Neben dem Assistenten blieben je Karte rund 280 px;
              ein Klarname wie „Studio Bianchi & Partner Commercialisti
              Associati S.r.l." wurde darin buchstabenweise zerlegt. */}
          {data && (
            <DomainProviders ref={providersRef} slug={slug} areaLabel={areaLabel} country={primaryCountry} />
          )}
        </div>
      </div>
    </UserShell>
  );
}
