import type { ReactNode } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnonProvider, SearchLaw } from '../api/search';
// Imported statically on purpose. Pulling the page in with await import()
// inside the test body charged the whole cold module graph (page + jspdf +
// lucide + router) to the first test's 5s budget, which CI — running this
// project alongside the chromium storybook suite on a 2-core runner — blew
// through. Worse than the timeout was the fallout: vitest aborts the test,
// RTL's afterEach cleanup runs on a still-empty body, and the pending import
// then resolves and mounts a tree nobody owns, so the *next* test found two
// "On the radar" headers. vi.mock is hoisted above imports, so the mocks
// below still apply; the transform cost now lands in the untimed collect phase.
import { ResultsRiskMap } from './ResultsRiskMap';

// Erster Titel der Design-Fixture, die bis 2026-09-22 auf der Risk Map stand.
// Die Fixture ist geloescht; der Titel bleibt als Anker, dass sie nicht zurueckkehrt.
const FORMER_FIXTURE_TITLE = 'OSS quarterly return';

// ─── Risk map · "Now" / "On the radar" grouping ──────────────────────────────
// The PPWR 2030 tranche put five obligations on the map that are law today but
// only apply in ~2030. This pins the split so they cannot drift back into
// competing with what is actually due.

const runSearch = vi.fn();
vi.mock('../api/search', () => ({ runSearch: (...a: unknown[]) => runSearch(...a) }));
const fetchSessions = vi.hoisted(() => vi.fn());
vi.mock('../api/sessions', () => ({
  saveWizardSession: vi.fn().mockResolvedValue(undefined),
  fetchSessions: (...a: unknown[]) => fetchSessions(...a),
  duplicateSession: vi.fn(),
}));
vi.mock('../lib/riskMapPdf', () => ({ generateRiskMapPdf: vi.fn() }));
// Veraenderbar, damit ein Test die eingeloggte Ansicht pruefen kann.
const auth = vi.hoisted(() => ({ isLoggedIn: false }));
vi.mock('../store/useAuthStore', () => ({ useAuthStore: () => auth }));
vi.mock('../components/user/UserShell', () => ({ UserShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
// t() resolves to the canonical EN default so assertions read as the user sees.
// Without a default it returns the key, with `count` and `pct` appended — so a
// test can tell "3 matched" from "1 matched" without a translation file.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (typeof opts?.defaultValue === 'string') return opts.defaultValue as string;
      const count = opts?.count !== undefined ? `#${String(opts.count)}` : '';
      const pct = opts?.pct !== undefined ? `@${String(opts.pct)}` : '';
      return `${key}${count}${pct}`;
    },
    i18n: { resolvedLanguage: 'en' },
  }),
}));

const law = (over: Partial<SearchLaw>): SearchLaw => ({
  id: 'x', title: 'X', description: '', severity: 'high', markets: [],
  source: 'src', due: 'Ongoing', state: 'likely', ...over,
});

/** Days out, as an ISO date, so the fixture never rots against the clock.
 *  Built from local date parts on purpose: toISOString() shifts to UTC, which
 *  in any positive-offset timezone rolls local midnight back to the previous
 *  day and makes every countdown assertion off by one. */
const inDays = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const renderPage = (url = '/en/results') => {
  render(<MemoryRouter initialEntries={[url]}><ResultsRiskMap /></MemoryRouter>);
};

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks leert nur die Aufruf-Historie, nicht die Warteschlange der
  // mockResolvedValueOnce-Antworten. Scheitert ein Test, bevor er seine
  // Einmal-Antwort verbraucht, bekaeme sonst der NAECHSTE Test sie — und
  // scheiterte mit, obwohl an ihm nichts falsch ist.
  runSearch.mockReset();
  localStorage.clear();
  auth.isLoggedIn = false;
  fetchSessions.mockResolvedValue([]);
});

describe('ResultsRiskMap grouping', () => {
  it('splits imminent duties from the far-future tranche', async () => {
    runSearch.mockResolvedValue({
      providers: [],
      laws: [
        law({ id: 'vat', title: 'VAT return', due: 'Quarterly', due_days: 30 }),
        law({ id: 'ppwr-2030', title: 'Empty Space Ratio', applies_from: inDays(1200) }),
        law({ id: 'ppwr-now', title: 'Packaging Conformity', applies_from: inDays(2) }),
      ],
    });
    renderPage();

    expect(await screen.findByText('Packaging Conformity')).toBeInTheDocument();
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText('On the radar')).toBeInTheDocument();

    // A duty landing in two days belongs to "Now" despite not having started;
    // one landing in 2030 does not. Compare document order.
    const pos = (text: string) => {
      const el = screen.getByText(text);
      return Array.from(document.querySelectorAll('*')).indexOf(el);
    };
    expect(pos('Now')).toBeLessThan(pos('Packaging Conformity'));
    expect(pos('Packaging Conformity')).toBeLessThan(pos('On the radar'));
    expect(pos('On the radar')).toBeLessThan(pos('Empty Space Ratio'));
    // VAT (in force) also sits above the divider.
    expect(pos('VAT return')).toBeLessThan(pos('On the radar'));
  });

  it('counts each group and shows a countdown only inside the horizon', async () => {
    runSearch.mockResolvedValue({
      providers: [],
      laws: [
        law({ id: 'a', title: 'Near duty', applies_from: inDays(2) }),
        law({ id: 'b', title: 'Far duty', applies_from: inDays(1200) }),
        law({ id: 'c', title: 'Far duty two', applies_from: inDays(1300) }),
      ],
    });
    renderPage();
    await screen.findByText('Near duty');

    // Group counts render next to the labels.
    const radarHeader = screen.getByText('On the radar').parentElement!;
    expect(within(radarHeader).getByText('2')).toBeInTheDocument();
    const nowHeader = screen.getByText('Now').parentElement!;
    expect(within(nowHeader).getByText('1')).toBeInTheDocument();

    // Inside the horizon the row counts down; beyond it the date stands alone,
    // because "applies in 1200 days" is not something anyone can act on.
    expect(screen.getByText('applies in 2 days')).toBeInTheDocument();
    expect(screen.queryByText(/applies in 1[23]00 days/)).not.toBeInTheDocument();
  });

  it('renders no group headers when nothing is staged', async () => {
    runSearch.mockResolvedValue({
      providers: [],
      laws: [law({ id: 'vat', title: 'VAT return', due_days: 30 })],
    });
    renderPage();
    await screen.findByText('VAT return');

    // Single group → the table looks exactly as it did before the split.
    expect(screen.queryByText('Now')).not.toBeInTheDocument();
    expect(screen.queryByText('On the radar')).not.toBeInTheDocument();
  });
});

// ─── Risk map · provider teaser ──────────────────────────────────────────────
// Until 2026-09-22 the teaser read "3 Verified Providers matched" with cards at
// 100/87/73 % for EVERY guest — hard-coded, whatever the engine found. Decision
// of that day: real count, real percentages, and nothing at all while the page
// only holds the design fixture (loading, API down).

const prov = (key: string, match: number): AnonProvider => ({
  provider_key: key, pseudonym_label: key, region: null, active_since: null,
  specializations: [], languages: [], rating: null, completed_count: null,
  avg_response_hours: null, billing_model: 'project', is_verified: true,
  match, match_tier: 'moderate',
});

describe('ResultsRiskMap provider teaser', () => {
  it('shows no cards and no sign-up prompt when the engine finds nobody', async () => {
    runSearch.mockResolvedValue({ providers: [], laws: [law({ id: 'vat', title: 'VAT return' })] });
    renderPage();

    expect(await screen.findByText('partners.none')).toBeInTheDocument();
    expect(screen.queryAllByTestId('teaser-card')).toHaveLength(0);
    expect(screen.queryByText('partners.unlockCta')).not.toBeInTheDocument();
  });

  it('shows the real count and the real match percentages', async () => {
    runSearch.mockResolvedValue({ providers: [prov('a', 87), prov('b', 60)], laws: [] });
    renderPage();

    expect(await screen.findByText('partners.eyebrow#2')).toBeInTheDocument();
    const cards = screen.getAllByTestId('teaser-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('partners.match@87%')).toBeInTheDocument();
    expect(within(cards[1]).getByText('partners.match@60%')).toBeInTheDocument();
    expect(screen.queryByText('partners.none')).not.toBeInTheDocument();
  });

  it('counts every match but shows at most three cards', async () => {
    runSearch.mockResolvedValue({
      providers: [prov('a', 100), prov('b', 87), prov('c', 73), prov('d', 60), prov('e', 60)],
      laws: [],
    });
    renderPage();

    expect(await screen.findByText('partners.eyebrow#5')).toBeInTheDocument();
    expect(screen.getAllByTestId('teaser-card')).toHaveLength(3);
  });

  it('claims nothing when the engine did not answer — the fixture is not a match', async () => {
    runSearch.mockRejectedValue(new Error('offline'));
    renderPage();
    // The table falls back to its fixture rows; wait for the page to settle.
    await screen.findAllByText(/./);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryAllByTestId('teaser-card')).toHaveLength(0);
    expect(screen.queryByText(/partners\.eyebrow/)).not.toBeInTheDocument();
    expect(screen.queryByText('partners.none')).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });
});

// ─── Risk map · the engine found nothing ─────────────────────────────────────
// Until 2026-09-22 an empty engine answer fell back to the design fixture: the
// page showed eight invented obligations as if the engine had found them. An
// empty answer is a result, not a loading state.

describe('ResultsRiskMap with zero obligations', () => {
  it('shows the approved state instead of the fixture — guest view', async () => {
    runSearch.mockResolvedValue({ providers: [], laws: [] });
    renderPage();

    expect(await screen.findByText('common:states.noRequirements.heading')).toBeInTheDocument();
    expect(screen.getByText('common:states.noRequirements.message')).toBeInTheDocument();
    expect(screen.queryByText(FORMER_FIXTURE_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText('table.obligation')).not.toBeInTheDocument();
    // A guest has no saved answers to review — the wizard would open empty.
    expect(screen.queryByRole('button', { name: 'common:states.actions.reviewMyAnswers' })).not.toBeInTheDocument();
  });

  it('ignores knowledge hits without a severity — they are not obligations', async () => {
    runSearch.mockResolvedValue({ providers: [], laws: [{ ...law({ id: 'kb', title: 'Background note' }), severity: undefined }] });
    renderPage();

    expect(await screen.findByText('common:states.noRequirements.heading')).toBeInTheDocument();
    expect(screen.queryByText('Background note')).not.toBeInTheDocument();
  });

  it('shows the state in the signed-in view, with a way to the answers and no empty PDF', async () => {
    auth.isLoggedIn = true;
    fetchSessions.mockResolvedValue([{
      id: 's1', country: 'AT', markets: ['AT'], categories: ['data-privacy'], label: 'Austria',
      answers: null, status: 'active', risk_summary: null,
      created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
    }]);
    runSearch.mockResolvedValue({ providers: [], laws: [] });
    renderPage('/en/results?session=s1');

    expect(await screen.findByText('common:states.noRequirements.heading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common:states.actions.reviewMyAnswers' })).toBeInTheDocument();
    expect(screen.queryByText(FORMER_FIXTURE_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'snapshot.exportPdf' })).not.toBeInTheDocument();
  });
});

// ─── Risk map · loading and failure ──────────────────────────────────────────
// Until 2026-09-22 both showed the design fixture — eight invented obligations,
// "8 obligations identified" — while the engine was still computing or had not
// answered at all. The fixture is gone; both are approved states now.

describe('ResultsRiskMap while loading and on failure', () => {
  it('says it is working while the engine computes — no numbers, no rows', async () => {
    runSearch.mockReturnValue(new Promise(() => {})); // never answers
    renderPage();

    expect(await screen.findByText('common:states.riskMapLoading.heading')).toBeInTheDocument();
    expect(screen.getByText('common:states.riskMapLoading.message')).toBeInTheDocument();
    expect(screen.queryByText(FORMER_FIXTURE_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText('obligations identified')).not.toBeInTheDocument();
    expect(screen.queryByText('table.obligation')).not.toBeInTheDocument();
    // No map yet — so nothing to save, and no "Here's what applies to you."
    expect(screen.queryByText('topbar.saveMap')).not.toBeInTheDocument();
    expect(screen.queryByText('cta.title')).not.toBeInTheDocument();
    expect(screen.queryByText('header.title')).not.toBeInTheDocument();
  });

  it('says it failed when the engine does not answer, and Try Again really asks again', async () => {
    runSearch.mockRejectedValueOnce(new Error('offline'));
    renderPage();

    expect(await screen.findByText('common:states.riskMapFailed.heading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common:states.actions.contactSupport' })).toBeInTheDocument();
    expect(screen.queryByText(FORMER_FIXTURE_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText('obligations identified')).not.toBeInTheDocument();
    expect(screen.queryByText('topbar.saveMap')).not.toBeInTheDocument();
    expect(screen.queryByText('header.title')).not.toBeInTheDocument();

    runSearch.mockResolvedValueOnce({ providers: [], laws: [law({ id: 'vat', title: 'VAT return' })] });
    fireEvent.click(screen.getByRole('button', { name: 'common:states.actions.tryAgain' }));

    expect(await screen.findByText('VAT return')).toBeInTheDocument();
    expect(screen.queryByText('common:states.riskMapFailed.heading')).not.toBeInTheDocument();
    // With a result the map can be saved again.
    expect(screen.getByText('topbar.saveMap')).toBeInTheDocument();
    expect(screen.getByText('header.title')).toBeInTheDocument();
    expect(runSearch).toHaveBeenCalledTimes(2);
  });

  it('shows no rings and no PDF link in the signed-in view while there is no result', async () => {
    auth.isLoggedIn = true;
    runSearch.mockRejectedValue(new Error('offline'));
    renderPage();

    expect(await screen.findByText('common:states.riskMapFailed.heading')).toBeInTheDocument();
    expect(screen.queryByText('snapshot.kpiTotal')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'snapshot.exportPdf' })).not.toBeInTheDocument();
  });
});
