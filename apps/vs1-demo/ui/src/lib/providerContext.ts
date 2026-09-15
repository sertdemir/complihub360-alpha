import { fetchDomainOverview, type DomainObligation } from '../api/domain';
import { fetchSessions } from '../api/sessions';
import { runSearch, type AnonProvider } from '../api/search';
import { isAreaSlug } from './areaProfiles';
import type { SearchProfile } from '../components/wizard/WizardContext';

// ─── Woher der Nutzer kommt, wenn er einen Anbieter öffnet ───────────────────
// Die Partnerseite (Canvas "Partnerseite", Nutzer-Wahl 2026-09-15) beantwortet
// nicht „wer ist das", sondern „passt der zu dem, was ich gerade offen habe".
// Dafür muss sie den Bezug kennen — und den kennt nur die Seite, von der aus
// geklickt wurde. Er steht deshalb in der URL:
//
//   /provider/:key?area=tax-vat        — aus der Bereichsseite
//   /provider/:key?session=<uuid>      — aus der Sitzungsseite
//
// Ohne Parameter bleibt der Bezug leer. Dann zeigt die Seite den Anbieter
// ohne Lage-Satz und ohne Matrix und sagt das auch — sie erfindet keine
// Sitzung, nur damit die Sektion gefüllt ist.
//
// Beides läuft über GET /domain/:slug, weil dort die Pflichten schon durch die
// Engine gerechnet sind. Bei einer Sitzung werden nur die Bereiche geladen,
// die diese Sitzung wirklich hat (meist einer bis drei), und die Pflichten
// danach auf diese eine Sitzung gefiltert.

export interface ContextDuty {
  o: DomainObligation;
  sessionId: string;
  sessionTitle: string;
}

export interface ProviderContext {
  kind: 'area' | 'session';
  /** Überschrift der Brotkrume: Bereichsname oder Sitzungstitel. */
  label: string;
  /** Rückweg — Bereichsseite oder Sitzungsseite. */
  backTo: string;
  /** Bereich, aus dem geöffnet wurde (nur kind === 'area'). */
  areaSlug?: string;
  sessionId?: string;
  /** Märkte des Nutzers in diesem Bezug, Großbuchstaben, ohne Dubletten. */
  markets: string[];
  /** Offene Pflichten (offen oder angefangen) im Bezug. */
  duties: ContextDuty[];
  /** Bereichs-Slugs des Bezugs — die Grundlage der Match-Zahl. */
  domains: string[];
  /** Zahl der Sitzungen, aus denen die Pflichten stammen. */
  sessionCount: number;
  /** Der Anbieter, wie die Suche ihn in diesem Bezug bewertet — Quelle der
   *  Match-Zahl und ihrer Begründung. null, wenn die Suche ihn nicht
   *  zurückgibt; dann zeigt der Kopf keine Zahl. */
  self: AnonProvider | null;
}

const RANG: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

const isOpen = (o: DomainObligation) => o.status === 'open' || o.status === 'in_progress';

const up = (list: (string | null | undefined)[]) =>
  [...new Set(list.filter((m): m is string => !!m).map((m) => m.toUpperCase()))];

/** Lädt den Bezug zu `?area=` bzw. `?session=`. Wirft nie: schlägt ein Teil
 *  fehl, fehlt eben dieser Teil — die Seite bleibt benutzbar. */
export async function loadProviderContext(
  params: URLSearchParams,
  providerKey: string,
  locale: string,
): Promise<ProviderContext | null> {
  const area = params.get('area');
  const sessionId = params.get('session');
  if (area && isAreaSlug(area)) return areaContext(area, providerKey, locale);
  if (sessionId) return sessionContext(sessionId, providerKey, locale);
  return null;
}

async function areaContext(slug: string, providerKey: string, locale: string): Promise<ProviderContext | null> {
  const d = await fetchDomainOverview(slug).catch(() => null);
  if (!d) return null;
  const sessions = d.sessions ?? [];
  const duties: ContextDuty[] = sessions
    .flatMap((s) => s.obligations.filter(isOpen).map((o) => ({ o, sessionId: s.id, sessionTitle: sessionLabel(s.label, s.country) })))
    .sort((a, b) => RANG[b.o.severity] - RANG[a.o.severity] || (a.o.dueDays ?? 9999) - (b.o.dueDays ?? 9999));
  const markets = up(sessions.flatMap((s) => [s.country, ...s.markets]));
  return {
    kind: 'area',
    label: '',                       // die Seite setzt das übersetzte Bereichs-Label
    backTo: `/${locale}/dashboard/workbench/${slug}`,
    areaSlug: slug,
    markets,
    duties,
    domains: [slug],
    sessionCount: sessions.length,
    self: await matchFor(providerKey, markets[0] ?? 'DE', [slug]),
  };
}

async function sessionContext(sessionId: string, providerKey: string, locale: string): Promise<ProviderContext | null> {
  const session = await fetchSessions().then((all) => all.find((s) => s.id === sessionId) ?? null).catch(() => null);
  if (!session) return null;
  const domains = (session.categories ?? []).filter(isAreaSlug);
  const markets = up([session.country, ...(session.markets ?? [])]);
  // Nur die Bereiche dieser Sitzung laden — nicht alle acht.
  const overviews = await Promise.all(domains.map((slug) => fetchDomainOverview(slug).catch(() => null)));
  const title = sessionLabel(session.label, session.country);
  const seen = new Set<string>();
  const duties: ContextDuty[] = [];
  for (const d of overviews) {
    const mine = d?.sessions.find((s) => s.id === sessionId);
    for (const o of mine?.obligations.filter(isOpen) ?? []) {
      // Eine Pflicht kann in zwei Bereichen dieser Sitzung auftauchen — hier
      // ist der Bezug die Sitzung, also steht sie einmal.
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      duties.push({ o, sessionId, sessionTitle: title });
    }
  }
  duties.sort((a, b) => RANG[b.o.severity] - RANG[a.o.severity] || (a.o.dueDays ?? 9999) - (b.o.dueDays ?? 9999));
  return {
    kind: 'session',
    label: title,
    backTo: `/${locale}/results?session=${sessionId}`,
    sessionId,
    markets,
    duties,
    domains,
    sessionCount: 1,
    self: await matchFor(providerKey, markets[0] ?? session.country ?? 'DE', domains),
  };
}

/** Dieselbe Suche, die auch die Karte gefüllt hat — damit die Zahl auf der
 *  Detailseite dieselbe ist wie die auf der Karte, aus der geklickt wurde. */
async function matchFor(providerKey: string, country: string, categories: string[]): Promise<AnonProvider | null> {
  if (!categories.length) return null;
  const res = await runSearch({ country, categories: categories as SearchProfile['categories'] }).catch(() => null);
  return res?.providers?.find((p) => p.provider_key === providerKey) ?? null;
}

function sessionLabel(label: string | null, country: string | null): string {
  return label || country || '—';
}
