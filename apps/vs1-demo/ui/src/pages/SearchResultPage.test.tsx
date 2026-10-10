import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// ─── /search als ehrliche Bruecke (Canvas A1 · B3 · C2 · D2) ─────────────────
// Gegenprobe: nichts von der alten Platzhalter-Antwort (feste Quellen, feste
// Pflichten mit Risikostufe, Vorschau-Badge) darf auf irgendeinem Weg erscheinen.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o && 'query' in o ? `${k}|${o.query}` : k), i18n: { resolvedLanguage: 'de' } }),
}));

import { SearchResultPage } from './SearchResultPage';

const at = (url: string) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/:locale/search" element={<SearchResultPage />} /></Routes>
  </MemoryRouter>,
);
const OLD = [/UStG §18i/, /2006\/112/, /VerpackG/, /search\.obligations/, /search\.previewBadge/, /search\.answerEyebrow/, /search\.sev\./];

describe('Suchseite', () => {
  it('Frage als Ueberschrift, Grenze benannt, Weg zum Menschen, Bruecke', () => {
    at('/de/search?q=Brauche%20ich%20eine%20Cookie-Einwilligung%3F');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('search.answerTitleFor|Brauche ich eine Cookie-Einwilligung?');
    expect(screen.getByText('search.noAnswerTitle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'search.humanLink' }).getAttribute('href')).toBe('/de/contact?lane=support');
    expect(screen.getByRole('button', { name: /search\.bridgeCta/ })).toBeInTheDocument();
    for (const re of OLD) expect(screen.queryByText(re)).not.toBeInTheDocument();
  });

  it('passender Bereich nach Stichwort, mit Link und Hinweis', () => {
    at('/de/search?q=Brauche%20ich%20eine%20Cookie-Einwilligung%3F');
    expect(screen.getByText('search.areasTitleOne')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /register\.domains\.dataPrivacy/ });
    expect(link.getAttribute('href')).toBe('/de/compliance/data-privacy');
    expect(screen.getByText('search.areasNote')).toBeInTheDocument();
  });

  it('ohne Treffer kein Bereichs-Block; ohne Frage traegt der Hinweis die h1', () => {
    at('/de/search?q=Hallo');
    expect(screen.queryByTestId('search-areas')).not.toBeInTheDocument();
    at('/de/search');
    expect(screen.getAllByRole('heading', { level: 1 }).some((h) => h.textContent === 'search.noAnswerTitle')).toBe(true);
  });
});
