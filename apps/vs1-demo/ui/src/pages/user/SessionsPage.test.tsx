import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionRowData } from '../../api/sessions';
import type { SearchLaw, SearchResult } from '../../api/search';
import { SessionsPage } from './SessionsPage';

// Erster Titel der Design-Fixture, die bis 2026-09-22 auf der Risk Map stand.
// Die Fixture ist geloescht; der Titel bleibt als Anker, dass sie nicht zurueckkehrt.
const FORMER_FIXTURE_TITLE = 'OSS quarterly return';

// ─── Sitzungsseite · PDF-Export ──────────────────────────────────────────────
// Bis 2026-09-22 exportierte jede Kachel dieselbe PDF: die acht erfundenen
// Pflichten der Design-Fixture, "3 Verified Providers ready", und als Kopfzeile
// das Profil des letzten Wizard-Laufs. Diese Tests halten fest, dass die PDF
// einer Sitzung aus der Engine-Antwort fuer GENAU diese Sitzung entsteht — und
// dass es ohne Engine-Antwort keine PDF gibt, statt einer erfundenen.

// vi.mock wird ueber die Imports gehoben — was die Fabriken brauchen, muss mit.
const { runSearch, generateRiskMapPdf, session } = vi.hoisted(() => ({
  runSearch: vi.fn(),
  generateRiskMapPdf: vi.fn(),
  session: (id: string, country: string, categories: string[]): SessionRowData => ({
    id, country, markets: [country], categories, label: `Sitzung ${id}`,
    answers: null, status: 'active', risk_summary: { level: 'medium' },
    created_at: '2026-09-01T00:00:00Z', updated_at: new Date().toISOString(),
  }),
}));

vi.mock('../../api/sessions', () => ({
  fetchSessions: vi.fn().mockResolvedValue([
    session('a', 'DE', ['tax-vat']),
    session('b', 'AT', ['data-privacy']),
  ]),
  patchSession: vi.fn(),
}));
vi.mock('../../api/dashboard', () => ({
  fetchDashboard: vi.fn().mockResolvedValue({ sessions: { items: [] }, obligations: { open: 0 } }),
}));
vi.mock('../../api/search', () => ({ runSearch: (...a: unknown[]) => runSearch(...a) }));
vi.mock('../../lib/riskMapPdf', () => ({ generateRiskMapPdf: (...a: unknown[]) => generateRiskMapPdf(...a) }));
vi.mock('../../components/user/UserShell', () => ({ UserShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
// t() gibt den Schluessel zurueck (oder den defaultValue): geprueft wird, WELCHE
// Copy erscheint, nicht ihr Wortlaut — der liegt bei `npm run copy:check`.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      typeof opts?.defaultValue === 'string' ? (opts.defaultValue as string) : key,
    i18n: { resolvedLanguage: 'en', language: 'en' },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const law = (over: Partial<SearchLaw>): SearchLaw => ({
  id: 'x', title: 'X', description: '', severity: 'high', markets: ['AT'],
  source: 'DSGVO Art. 30', due: 'Ongoing', state: 'confirmed', ...over,
});
const result = (laws: SearchLaw[]): SearchResult => ({ overview_summary: '', providers: [], laws });

/** Oeffnet das ···-Menue der n-ten Kachel und waehlt "PDF exportieren". */
async function exportTile(n: number) {
  const menus = await screen.findAllByRole('button', { name: 'sessions.moreActions' });
  fireEvent.click(menus[n]);
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'sessions.exportPdf' }));
}

const renderPage = () => render(<MemoryRouter><SessionsPage /></MemoryRouter>);

describe('SessionsPage · PDF-Export', () => {
  beforeEach(() => {
    runSearch.mockReset();
    generateRiskMapPdf.mockReset();
  });

  it('exportiert die Risk Map der angeklickten Sitzung aus der Engine-Antwort', async () => {
    runSearch.mockResolvedValue(result([law({ id: 'gdpr-ropa', title: 'Records of processing activities' })]));
    renderPage();
    // Die Reihenfolge der Kacheln ist die der Seite (zuletzt aktualisiert zuerst);
    // welche es ist, sagt der Aufruf an die Engine.
    await exportTile(0);

    await waitFor(() => expect(generateRiskMapPdf).toHaveBeenCalledTimes(1));
    const query = runSearch.mock.calls[0][0] as { country: string; categories: string[] };
    const pdf = generateRiskMapPdf.mock.calls[0][0] as {
      profile: { country: string; categories: string[] };
      obligations: { title: string }[];
      stats: { value: string }[];
    };

    // Kopfzeile und Abfrage gehoeren zu DERSELBEN Sitzung.
    expect(pdf.profile.country).toBe(query.country);
    expect(pdf.profile.categories).toEqual(query.categories);
    // Inhalt: die Engine, nicht die Fixture.
    expect(pdf.obligations.map((o) => o.title)).toEqual(['Records of processing activities']);
    expect(pdf.obligations.map((o) => o.title)).not.toContain(FORMER_FIXTURE_TITLE);
    expect(pdf.stats[0].value).toBe('1');
  });

  it('fragt fuer jede Kachel mit deren eigenem Land und Bereich', async () => {
    runSearch.mockResolvedValue(result([law({})]));
    renderPage();
    await exportTile(0);
    await waitFor(() => expect(generateRiskMapPdf).toHaveBeenCalledTimes(1));
    await exportTile(1);
    await waitFor(() => expect(generateRiskMapPdf).toHaveBeenCalledTimes(2));

    const laender = runSearch.mock.calls.map((c) => (c[0] as { country: string }).country).sort();
    expect(laender).toEqual(['AT', 'DE']);
  });

  it('erzeugt ohne Engine-Antwort keine PDF und sagt es', async () => {
    runSearch.mockRejectedValue(new Error('offline'));
    renderPage();
    await exportTile(0);

    expect(await screen.findByText('common:states.riskMapFailed.heading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common:states.actions.tryAgain' })).toBeInTheDocument();
    expect(generateRiskMapPdf).not.toHaveBeenCalled();
  });

  it('erzeugt ohne gefundene Pflicht keine leere PDF, sondern sagt, was das heisst', async () => {
    runSearch.mockResolvedValue(result([]));
    renderPage();
    await exportTile(0);

    expect(await screen.findByText('common:states.noRequirements.heading')).toBeInTheDocument();
    expect(screen.getByText('common:states.noRequirements.message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common:states.actions.reviewMyAnswers' })).toBeInTheDocument();
    expect(generateRiskMapPdf).not.toHaveBeenCalled();
  });
});
