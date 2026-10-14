import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { Application } from '../../api/application';

// ─── Bewerbung · Entwurf und Einreichen (V2, 11.10.2026) ─────────────────────
// Ein Entwurf darf Luecken haben: Speichern sperrt nie wegen leerer
// Pflichtfelder — was fuer die Einreichung fehlt, nennt „Noch offen".
// Gepruefte Fehler gibt es nur fuer Falsch-Eingetragenes (E-Mail-Form).
// Einreichen: gesperrt bleibt ein Zustand; jeder Eintrag unter „Noch offen"
// fuehrt an seine Stelle.

const api = vi.hoisted(() => ({ fetchApplication: vi.fn(), patchApplication: vi.fn() }));
vi.mock('../../components/provider/ProviderShell', () => ({ ProviderShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/application', async (orig) => ({
  ...(await orig<typeof import('../../api/application')>()),
  fetchApplication: () => api.fetchApplication(),
  patchApplication: (...a: unknown[]) => api.patchApplication(...a),
  fetchChanges: () => Promise.resolve([]),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

import { ApplicationPage } from './ApplicationPage';

const chapter = (complete: boolean, missing: string[] = []) => ({ complete, missing });
const draft = (missing: string[] = []): Application => ({
  provider: {
    provider_key: 'k', name: 'Studio Bianchi', website_url: null, contact_email: 'info@bianchi.example', languages: [], region: null, active_since: null,
    vat_id: null, vat_id_status: null, vat_id_checked_at: null, lifecycle_status: 'draft', lifecycle_status_since: null, lifecycle_status_reason: null,
    billing_ready: false, billing_block_reasons: [],
  },
  confidential: null,
  chapters: { account: chapter(true), legal: chapter(false), services: chapter(false), evidence: chapter(false), agreements: chapter(false), submit: { ready: false, missing } },
  services: [], checklist: [], evidence: [], agreements: [], open_requests: [],
});

const legalCard = async () => {
  const heading = await screen.findByRole('heading', { name: /application\.chapter\.legal/ });
  return heading.parentElement!.parentElement!;
};

describe('ApplicationPage · Rechtsform (V2)', () => {
  beforeEach(() => { api.fetchApplication.mockReset(); api.patchApplication.mockReset(); });

  it('ein halb ausgefuellter Entwurf wird gespeichert — keine Sperre, keine Zusammenfassung', async () => {
    api.fetchApplication.mockResolvedValue(draft());
    api.patchApplication.mockResolvedValue(undefined);
    render(<ApplicationPage />);
    const card = await legalCard();
    fireEvent.change(document.getElementById('app-legal-entity_type')!, { target: { value: 'SRL' } });
    fireEvent.click(within(card).getByRole('button', { name: 'application.save' }));
    await waitFor(() => expect(api.patchApplication).toHaveBeenCalledWith(expect.objectContaining({ entity_type: 'SRL', registration_number: '' })));
    expect(within(card).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Konto: eine falsch geformte E-Mail steht am Feld (alert), Fokus dorthin, nichts geht ab', async () => {
    api.fetchApplication.mockResolvedValue(draft());
    render(<ApplicationPage />);
    await legalCard();
    const email = document.getElementById('app-account-contact_email') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'info@bianchi' } });
    const card = (await screen.findByRole('heading', { name: /application\.chapter\.account/ })).parentElement!.parentElement!;
    fireEvent.click(within(card).getByRole('button', { name: 'application.save' }));
    expect(within(card).getByRole('alert')).toHaveTextContent('common:contactSend.field.email');
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute('aria-describedby', 'app-account-contact_email-error');
    expect(api.patchApplication).not.toHaveBeenCalled();
  });

  it('Einreichen bleibt gesperrt (Zustand), nennt den Grund — und jeder offene Punkt fuehrt ins Feld', async () => {
    api.fetchApplication.mockResolvedValue(draft(['legal.registration_number', 'evidence.insurance']));
    render(<ApplicationPage />);
    const cta = await screen.findByRole('button', { name: 'application.submit.cta' });
    expect(cta).toBeDisabled();
    expect(cta).toHaveAttribute('aria-describedby', 'app-submit-lock');
    expect(document.getElementById('app-submit-lock')).toHaveTextContent('application.submit.lockedHint');

    fireEvent.click(screen.getByRole('button', { name: 'application.missing.legal.registration_number' }));
    expect(document.getElementById('app-legal-registration_number')).toHaveFocus();

    // Ohne eigenes Feld: der Sprung landet auf der Kapitel-Ueberschrift.
    fireEvent.click(screen.getByRole('button', { name: 'application.missing.evidence.insurance' }));
    expect(document.getElementById('app-chapter-evidence')).toHaveFocus();
  });
});
