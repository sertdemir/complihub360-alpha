import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Application } from '../../api/application';

// ─── Zahlungsmandat Fassung 2026-10 im Annahme-Modal (15.10.2026) ────────────
// Bis dahin war `billing_authorization 2026-09` eine Versionsnummer ohne Text:
// der Anbieter las einen Satz und bestaetigte. Seit 2026-10-15 steht der volle
// Mandatstext (docs/legal/zahlungsmandat-2026-10-entwurf.md) im Modal — als
// Interim, bis die Rechtspruefung ihn bestaetigt oder ersetzt. Drei Dinge
// muessen halten:
//   1. Eine Annahme der alten Fassung sagt „neue Fassung liegt vor" und fuehrt
//      zum Annehmen; sie faellt nicht still auf „Dokument oeffnen" zurueck.
//   2. Die Annahme sendet die Fassung des DOKUMENTS (2026-10), nicht die der
//      uebrigen Vereinbarungen (2026-09).
//   3. Alle vier Sprachdateien tragen dieselbe Struktur — neun Abschnitte,
//      gleich viele Punkte je Abschnitt — sonst liest eine Sprache weniger.

const api = vi.hoisted(() => ({ fetchApplication: vi.fn(), acceptAgreement: vi.fn() }));
vi.mock('../../components/provider/ProviderShell', () => ({ ProviderShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/application', async (orig) => ({
  ...(await orig<typeof import('../../api/application')>()),
  fetchApplication: () => api.fetchApplication(),
  acceptAgreement: (...a: unknown[]) => api.acceptAgreement(...a),
  fetchChanges: () => Promise.resolve([]),
}));
const SECTIONS = [
  { title: 'Abschnitt eins', items: ['Ein Satz.'] },
  { title: 'Abschnitt zwei', intro: 'Nur diese:', items: ['Punkt A', 'Punkt B'] },
];
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (k === 'application.mandate.sections' ? SECTIONS : o && 'version' in o ? `${k}:${String(o.version)}` : k),
    i18n: { resolvedLanguage: 'de' },
  }),
}));

import { ApplicationPage } from './ApplicationPage';

const chapter = (complete: boolean, missing: string[] = []) => ({ complete, missing });
const app = (): Application => ({
  provider: {
    provider_key: 'k', name: 'Studio Bianchi', website_url: null, contact_email: 'info@bianchi.example', languages: [], region: null, active_since: null,
    vat_id: null, vat_id_status: null, vat_id_checked_at: null, lifecycle_status: 'draft', lifecycle_status_since: null, lifecycle_status_reason: null,
    billing_ready: false, billing_block_reasons: [],
  },
  confidential: null,
  chapters: { account: chapter(true), legal: chapter(true), services: chapter(true), evidence: chapter(true), agreements: chapter(true), submit: { ready: true, missing: [] } },
  services: [], checklist: [], evidence: [], open_requests: [],
  agreements: [
    { agreement_type: 'provider_agreement', version: '2026-09', language: 'de', accepted_at: '2026-09-20T10:00:00Z', accepted_by_name: 'Anna' },
    { agreement_type: 'privacy_notice', version: '2026-09', language: 'de', accepted_at: '2026-09-20T10:00:00Z', accepted_by_name: 'Anna' },
    { agreement_type: 'billing_authorization', version: '2026-09', language: 'de', accepted_at: '2026-09-20T10:00:00Z', accepted_by_name: 'Anna' },
  ] as Application['agreements'],
});

const agreementsCard = async () => {
  const heading = await screen.findByRole('heading', { name: /application\.chapter\.agreements/ });
  return heading.parentElement!.parentElement!;
};

describe('ApplicationPage · Zahlungsmandat 2026-10', () => {
  beforeEach(() => { api.fetchApplication.mockReset(); api.acceptAgreement.mockReset(); });

  it('eine Annahme der Fassung 2026-09 zeigt die neue Fassung und fuehrt zum Annehmen; die uebrigen Vereinbarungen bleiben „angenommen"', async () => {
    api.fetchApplication.mockResolvedValue(app());
    render(<ApplicationPage />);
    const card = await agreementsCard();
    expect(within(card).getByText('application.mandate.newVersion:2026-10')).toBeInTheDocument();
    // Zwei „angenommen"-Zeilen (Vertrag, Datenschutz), eine mit neuer Fassung.
    expect(within(card).getAllByText(/application\.agreements\.acceptedOn/)).toHaveLength(2);
    expect(within(card).getAllByRole('button', { name: 'application.agreements.open' })).toHaveLength(2);
    expect(within(card).getAllByRole('button', { name: 'application.agreements.accept' })).toHaveLength(1);
  });

  it('das Modal zeigt den vollen Text mit Abschnitten und Hinweis, und die Annahme sendet die Fassung 2026-10', async () => {
    api.fetchApplication.mockResolvedValue(app());
    api.acceptAgreement.mockResolvedValue(undefined);
    render(<ApplicationPage />);
    const card = await agreementsCard();
    fireEvent.click(within(card).getByRole('button', { name: 'application.agreements.accept' }));
    const text = await screen.findByTestId('mandate-text');
    expect(within(text).getByRole('heading', { name: 'Abschnitt eins' })).toBeInTheDocument();
    expect(within(text).getByText('Nur diese:')).toBeInTheDocument();
    expect(within(text).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('application.mandate.reviewNote:2026-10')).toBeInTheDocument();
    fireEvent.change(document.getElementById('app-agreement-name')!, { target: { value: 'Anna Beispiel' } });
    fireEvent.click(screen.getByRole('button', { name: 'application.agreements.confirm:2026-10' }));
    await waitFor(() => expect(api.acceptAgreement).toHaveBeenCalledWith(expect.objectContaining({ agreement_type: 'billing_authorization', version: '2026-10', accepted_by_name: 'Anna Beispiel' })));
  });
});

describe('Zahlungsmandat · Sprachdateien tragen dieselbe Struktur', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const load = (lng: string) => JSON.parse(readFileSync(resolve(here, `../../../public/locales/${lng}/providerws.json`), 'utf8')).application.mandate;
  const en = load('en');

  it('en hat neun Abschnitte, jeder mit Titel und mindestens einem Punkt', () => {
    expect(en.sections).toHaveLength(9);
    for (const s of en.sections) { expect(typeof s.title).toBe('string'); expect(s.items.length).toBeGreaterThan(0); }
    expect(typeof en.newVersion).toBe('string');
    expect(typeof en.reviewNote).toBe('string');
  });

  for (const lng of ['de', 'es', 'tr']) {
    it(`${lng} hat dieselbe Form wie en und keinen offenen Platzhalter`, () => {
      const m = load(lng);
      expect(m.sections).toHaveLength(en.sections.length);
      m.sections.forEach((s: { title: string; intro?: string; items: string[] }, i: number) => {
        expect(s.items).toHaveLength(en.sections[i].items.length);
        expect(!!s.intro).toBe(!!en.sections[i].intro);
      });
      expect(JSON.stringify(m)).not.toMatch(/\[(Betreiber|Operator)\]/);
    });
  }
});
