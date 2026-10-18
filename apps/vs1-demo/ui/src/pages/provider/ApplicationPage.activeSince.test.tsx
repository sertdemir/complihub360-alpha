import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { Application } from '../../api/application';
import { ApiError } from '../../api/client';

// ─── Bewerbung · „Aktiv seit" (Punkt 3, 18.10.2026) ──────────────────────────
// Das Jahr lebt jetzt im Kapitel Konto (O2) und laeuft dort durch die
// Change-Control. Vorher stand es im Matchmaking: `parseInt(x) || null`
// verwarf „seit 2013" still, machte aus „2O13" das Jahr 2, und ein geleertes
// Feld liess das alte Jahr oeffentlich stehen — jedes Mal mit „Gespeichert".

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

const chapter = (complete: boolean) => ({ complete, missing: [] as string[] });
const app = (over: Partial<Application['provider']> = {}): Application => ({
  provider: {
    provider_key: 'k', name: 'Studio Bianchi', website_url: null, contact_email: 'info@bianchi.example', languages: [], region: null, active_since: 2015,
    vat_id: null, vat_id_status: null, vat_id_checked_at: null, lifecycle_status: 'draft', lifecycle_status_since: null, lifecycle_status_reason: null,
    billing_ready: false, billing_block_reasons: [], ...over,
  },
  confidential: null,
  chapters: { account: chapter(true), legal: chapter(false), services: chapter(false), evidence: chapter(false), agreements: chapter(false), submit: { ready: false, missing: [] } },
  services: [], checklist: [], evidence: [], agreements: [], open_requests: [],
});

const accountCard = async () => (await screen.findByRole('heading', { name: /application\.chapter\.account/ })).parentElement!.parentElement!;
const since = () => document.getElementById('app-account-active_since') as HTMLInputElement;
const save = (card: HTMLElement) => fireEvent.click(within(card).getByRole('button', { name: 'application.save' }));

describe('ApplicationPage · Aktiv seit (Punkt 3)', () => {
  beforeEach(() => { api.fetchApplication.mockReset(); api.patchApplication.mockReset(); });

  it('Feld mit Ziffern-Tastatur, verknuepftem Label und Hinweis', async () => {
    api.fetchApplication.mockResolvedValue(app());
    render(<ApplicationPage />);
    await accountCard();
    expect(screen.getByLabelText('application.account.activeSince')).toBe(since());
    expect(since()).toHaveValue('2015');
    expect(since()).toHaveAttribute('inputmode', 'numeric');
    expect(since()).toHaveAttribute('maxlength', '4');
    expect(since()).toHaveAttribute('aria-describedby', 'app-account-active_since-msg');
    expect(document.getElementById('app-account-active_since-msg')).toHaveTextContent('application.account.activeSinceHint');
  });

  it.each(['seit 2013', '2O13', '15', '1899', String(new Date().getFullYear() + 1)])('„%s" steht am Feld, Fokus dorthin, nichts geht ab', async (value) => {
    api.fetchApplication.mockResolvedValue(app());
    render(<ApplicationPage />);
    const card = await accountCard();
    fireEvent.change(since(), { target: { value } });
    save(card);
    expect(document.getElementById('app-account-active_since-error')).toHaveTextContent('application.account.activeSinceInvalid');
    expect(since()).toHaveAttribute('aria-invalid', 'true');
    expect(since()).toHaveFocus();
    expect(api.patchApplication).not.toHaveBeenCalled();
  });

  it('ein gueltiges Jahr geht als Zahl ab', async () => {
    api.fetchApplication.mockResolvedValue(app());
    api.patchApplication.mockResolvedValue(undefined);
    render(<ApplicationPage />);
    const card = await accountCard();
    fireEvent.change(since(), { target: { value: ' 2010 ' } });
    save(card);
    await waitFor(() => expect(api.patchApplication).toHaveBeenCalledWith(expect.objectContaining({ active_since: 2010 })));
  });

  it('geleert heisst „nicht anzeigen": null geht ab, die Bestaetigung sagt, was jetzt gilt (L1)', async () => {
    api.fetchApplication.mockResolvedValue(app());
    api.patchApplication.mockResolvedValue(undefined);
    render(<ApplicationPage />);
    const card = await accountCard();
    fireEvent.change(since(), { target: { value: '' } });
    save(card);
    await waitFor(() => expect(api.patchApplication).toHaveBeenCalledWith(expect.objectContaining({ active_since: null })));
    expect(await within(card).findByRole('status')).toHaveTextContent('application.account.activeSinceRemoved.message');
  });

  it('lehnt der Server das Jahr ab, steht der Satz am selben Feld', async () => {
    api.fetchApplication.mockResolvedValue(app());
    api.patchApplication.mockRejectedValue(new ApiError('raw server text', 400, 'ref-1', undefined, { errorCode: 'VALIDATION_ERROR', field: 'active_since' }));
    render(<ApplicationPage />);
    const card = await accountCard();
    save(card);
    expect(await within(card).findByText('application.account.activeSinceInvalid')).toBeInTheDocument();
    expect(since()).toHaveFocus();
    expect(within(card).queryByText('application.saveError')).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent('raw server text');
  });

  it('aktiver Anbieter: Leseansicht zeigt das Jahr, beim Bearbeiten steht der Pruef-Hinweis', async () => {
    api.fetchApplication.mockResolvedValue(app({ lifecycle_status: 'active' }));
    render(<ApplicationPage />);
    const card = await accountCard();
    expect(within(card).getByText('2015')).toBeInTheDocument();
    expect(within(card).queryByText('application.account.reviewNote')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'application.edit' }));
    expect(within(card).getByText('application.account.reviewNote')).toBeInTheDocument();
  });

  it('vor der Aktivierung kein Pruef-Hinweis — dort prueft das Review der Bewerbung alles', async () => {
    api.fetchApplication.mockResolvedValue(app());
    render(<ApplicationPage />);
    const card = await accountCard();
    expect(within(card).queryByText('application.account.reviewNote')).not.toBeInTheDocument();
  });
});
