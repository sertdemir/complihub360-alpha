import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';

// ─── Kontakt und Bewerbung senden (Canvas-Wahl A3 · B2 · C1 · D2) ────────────
// Der Versand geht an POST /api/v1/contact. Geprueft wird die Verdrahtung:
// was abgeht, welcher Zustand danach steht, und dass ein Fehler den Text
// stehen laesst. Gegenprobe: kein Vorschau-Hinweis, keine Platzhalter-Adresse.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o && 'email' in o ? `${k}|${o.email}` : k),
    i18n: { resolvedLanguage: 'de' },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));
vi.mock('../components/home', () => ({ SiteFooter: () => null }));
vi.mock('../components/home/HomeFaq', () => ({ FaqList: () => null }));
vi.mock('../components/providers/SectionHeading', () => ({
  Reveal: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  SectionEyebrow: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  GoldWord: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../components/auth/SystemFooter', () => ({ SystemFooter: () => null }));
vi.mock('../api/contact', async (orig) => ({ ...(await orig<typeof import('../api/contact')>()), CONTACT_INBOX: 'hallo@complihub.test' }));

import { ContactPage } from './ContactPage';
import { PartnerApplyPage } from './PartnerApplyPage';

const fetchMock = vi.fn();
const reply = (status: number, body: Record<string, unknown>) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const contact = () => render(<MemoryRouter><ContactPage /></MemoryRouter>);
function fillContact() {
  fireEvent.change(screen.getByLabelText('contact.form.name'), { target: { value: 'Jana Beispiel' } });
  fireEvent.change(screen.getByLabelText('contact.form.email'), { target: { value: 'jana@firma.de' } });
  fireEvent.change(screen.getByLabelText('contact.form.message'), { target: { value: 'Die Risk Map zeigt DE doppelt.' } });
}
const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string);

describe('Kontaktseite', () => {
  it('kein Vorschau-Hinweis, keine Platzhalter-Adresse, die eine Adresse unter dem Formular (C1)', () => {
    contact();
    expect(screen.queryByText(/draftNote|notWired/)).not.toBeInTheDocument();
    expect(screen.queryByText(/@…/)).not.toBeInTheDocument();
    expect(screen.getByText('contact.form.direct')).toBeInTheDocument();
    expect(screen.getByText('hallo@complihub.test')).toBeInTheDocument();
  });

  it('leere Felder: Hinweise am Feld, nichts geht hinaus', () => {
    contact();
    fireEvent.click(screen.getByRole('button', { name: 'contact.form.submit' }));
    expect(screen.getByText('contactSend.field.name')).toBeInTheDocument();
    expect(screen.getByText('contactSend.field.email')).toBeInTheDocument();
    expect(screen.getByText('contactSend.field.message')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('angekommen (A3): Weg, Sprache und Felder gehen hinaus, Schritt 1 erledigt', async () => {
    fetchMock.mockReturnValue(reply(200, { ok: true, acknowledged: true }));
    contact();
    fireEvent.click(screen.getByRole('button', { name: 'contact.lane.privacy.short' }));
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'contact.form.submit' }));
    expect(await screen.findByText('contact.sent.title')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/contact$/);
    expect(sentBody()).toMatchObject({ lane: 'privacy', locale: 'de', name: 'Jana Beispiel', email: 'jana@firma.de', message: 'Die Risk Map zeigt DE doppelt.', hp: '' });
    expect(screen.getByText('contact.sent.body|jana@firma.de')).toBeInTheDocument();
    expect(document.querySelector('[data-step="ack"]')?.getAttribute('data-done')).toBe('true');
    expect(document.querySelector('[data-step="answer"]')?.getAttribute('data-done')).toBe('false');
  });

  it('angekommen, Bestaetigung nicht zugestellt: kein Haken, sondern der Hinweis', async () => {
    fetchMock.mockReturnValue(reply(200, { ok: true, acknowledged: false }));
    contact();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'contact.form.submit' }));
    expect(await screen.findByText('contactSend.ackFailed|jana@firma.de')).toBeInTheDocument();
    expect(document.querySelector('[data-step]')).toBeNull();
  });

  it('503 (B2): nicht abgeschickt, Text bleibt, Adresse und Referenz', async () => {
    fetchMock.mockReturnValue(reply(503, { errorCode: 'CONTACT_UNAVAILABLE', correlationId: 'ref-503' }));
    contact();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'contact.form.submit' }));
    expect(await screen.findByText('contactSend.failedTitle')).toBeInTheDocument();
    expect(screen.getByText(/contactSend\.failed\.unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/contactSend\.direct/)).toBeInTheDocument();
    expect(screen.getByLabelText('contact.form.message')).toHaveValue('Die Risk Map zeigt DE doppelt.');
    expect(screen.getByRole('button', { name: 'contactSend.retry' })).toBeInTheDocument();
    expect(screen.getByText(/states\.technicalDetails/)).toBeInTheDocument();
    expect(screen.queryByText('contact.sent.title')).not.toBeInTheDocument();
  });

  it('429 und offline: je eigener Satz', async () => {
    fetchMock.mockReturnValueOnce(reply(429, { errorCode: 'RATE_LIMIT_EXCEEDED' })).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    contact();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'contact.form.submit' }));
    expect(await screen.findByText(/contactSend\.failed\.rateLimit/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'contactSend.retry' }));
    expect(await screen.findByText(/contactSend\.failed\.network/)).toBeInTheDocument();
  });

  it('der Server bemaengelt ein Feld (400): Hinweis am Feld statt Ausfall', async () => {
    fetchMock.mockReturnValue(reply(400, { errorCode: 'VALIDATION_ERROR', field: 'email' }));
    contact();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'contact.form.submit' }));
    expect(await screen.findByText('contactSend.field.email')).toBeInTheDocument();
    expect(screen.queryByText('contactSend.failedTitle')).not.toBeInTheDocument();
  });
});

describe('Partner-Bewerbung', () => {
  const apply = () => render(<MemoryRouter><PartnerApplyPage /></MemoryRouter>);
  function fillApply() {
    fireEvent.change(screen.getByLabelText('partnerApply.firm'), { target: { value: 'Muster Steuerberatung' } });
    fireEvent.change(screen.getByLabelText('partnerApply.contact'), { target: { value: 'Max Muster' } });
    fireEvent.change(screen.getByLabelText('partnerApply.email'), { target: { value: 'max@kanzlei.de' } });
    fireEvent.change(screen.getByLabelText('partnerApply.credentials'), { target: { value: 'Steuerberater (DE)' } });
    fireEvent.click(screen.getByRole('button', { name: 'register.domains.taxVat' }));
    fireEvent.click(screen.getByRole('button', { name: 'DE' }));
  }

  it('angekommen (D2): strukturierte Bewerbung, links Schritt 01 mit Haken, kein Weg zurueck', async () => {
    fetchMock.mockReturnValue(reply(200, { ok: true, acknowledged: true }));
    apply();
    expect(screen.queryByText(/draftNote|notWired/)).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: /partnerApply\.submit/ });
    expect(submit).toBeDisabled();
    fillApply();
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(await screen.findByText('partnerApply.sent.title')).toBeInTheDocument();
    expect(sentBody()).toMatchObject({ lane: 'application', locale: 'de', name: 'Max Muster', email: 'max@kanzlei.de', firm: 'Muster Steuerberatung', credentials: 'Steuerberater (DE)', areas: ['tax-vat'], markets: ['DE'] });
    expect(document.querySelector('[data-step="review"]')?.getAttribute('data-done')).toBe('true');
    expect(screen.getByText('partnerApply.sent.progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'partnerApply.sent.home' })).toBeInTheDocument();
    expect(screen.queryByText(/backToForm/)).not.toBeInTheDocument();
  });

  it('502: Bewerbung nicht abgeschickt, Angaben bleiben', async () => {
    fetchMock.mockReturnValue(reply(502, { errorCode: 'CONTACT_SEND_FAILED' }));
    apply();
    fillApply();
    fireEvent.click(screen.getByRole('button', { name: /partnerApply\.submit/ }));
    expect(await screen.findByText('contactSend.failedTitleApplication')).toBeInTheDocument();
    expect(screen.getByText(/contactSend\.failed\.network/)).toBeInTheDocument();
    expect(screen.getByLabelText('partnerApply.firm')).toHaveValue('Muster Steuerberatung');
    await waitFor(() => expect(document.querySelector('[data-step="review"]')?.getAttribute('data-done')).toBe('false'));
  });
});
