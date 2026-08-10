import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SearchLaw } from '../api/search';

// ─── Risk map · "Now" / "On the radar" grouping ──────────────────────────────
// The PPWR 2030 tranche put five obligations on the map that are law today but
// only apply in ~2030. This pins the split so they cannot drift back into
// competing with what is actually due.

const runSearch = vi.fn();
vi.mock('../api/search', () => ({ runSearch: (...a: unknown[]) => runSearch(...a) }));
vi.mock('../api/sessions', () => ({
  saveWizardSession: vi.fn().mockResolvedValue(undefined),
  fetchSessions: vi.fn().mockResolvedValue([]),
}));
vi.mock('../lib/riskMapPdf', () => ({ generateRiskMapPdf: vi.fn() }));
vi.mock('../store/useAuthStore', () => ({ useAuthStore: () => ({ isLoggedIn: false }) }));
// t() resolves to the canonical EN default so assertions read as the user sees.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      typeof opts?.defaultValue === 'string' ? (opts.defaultValue as string) : key,
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

const renderPage = async () => {
  const { ResultsRiskMap } = await import('./ResultsRiskMap');
  render(<MemoryRouter><ResultsRiskMap /></MemoryRouter>);
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
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
    await renderPage();

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
    await renderPage();
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
    await renderPage();
    await screen.findByText('VAT return');

    // Single group → the table looks exactly as it did before the split.
    expect(screen.queryByText('Now')).not.toBeInTheDocument();
    expect(screen.queryByText('On the radar')).not.toBeInTheDocument();
  });
});
