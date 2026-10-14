import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Partner-Intake · V2 (11.10.2026) ────────────────────────────────────────
// Bis hierher blieb „Paket einreichen" grau, bis Name und Bestaetigung
// stimmten — ohne zu sagen, was fehlt. Jetzt: Knopf aktiv, Fehler am Feld und
// gesammelt am Knopf, Fokus aufs erste Feld, nichts geht ab.

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../api/client', async (orig) => ({ ...(await orig<typeof import('../../api/client')>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

import { ProviderIntakePage } from './ProviderIntakePage';

const page = () => render(<MemoryRouter initialEntries={['/intake?token=tok']}><ProviderIntakePage /></MemoryRouter>);
const submit = () => screen.getByRole('button', { name: 'intake.submit' });

describe('ProviderIntakePage · V2', () => {
  beforeEach(() => apiFetch.mockReset());

  it('laesst den Knopf aktiv und nennt beim Absenden beide fehlenden Angaben', () => {
    page();
    expect(submit()).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(submit());

    const summary = screen.getByRole('alert');
    expect(within(summary).getByText('common:states.formErrorSummary.heading')).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: 'intake.nameShort' })).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: 'intake.statutesShort' })).toBeInTheDocument();
    // Fehler am Feld, verdrahtet ueber aria-describedby.
    const name = document.getElementById('intake-name')!;
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAttribute('aria-describedby', 'intake-name-error');
    expect(document.getElementById('intake-name-error')).toHaveTextContent('intake.errors.name');
    expect(document.getElementById('intake-statutes-error')).toHaveTextContent('intake.errors.statutes');
    // Fokus aufs erste fehlerhafte Feld; nichts ging ab; der Knopf bleibt aktiv.
    expect(name).toHaveFocus();
    expect(apiFetch).not.toHaveBeenCalled();
    expect(submit()).toBeEnabled();
  });

  it('die Zusammenfassung laeuft nach dem ersten Versuch mit', () => {
    page();
    fireEvent.click(submit());
    fireEvent.change(document.getElementById('intake-name')!, { target: { value: 'Studio Bianchi' } });
    const summary = screen.getByRole('alert');
    expect(within(summary).queryByRole('button', { name: 'intake.nameShort' })).not.toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: 'intake.statutesShort' })).toBeInTheDocument();
    fireEvent.click(document.getElementById('intake-statutes')!);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sendet, wenn alles stimmt', async () => {
    apiFetch.mockResolvedValue({ ok: true });
    page();
    fireEvent.change(document.getElementById('intake-name')!, { target: { value: 'Studio Bianchi' } });
    fireEvent.click(document.getElementById('intake-statutes')!);
    fireEvent.click(submit());
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/v1/provider/intake', expect.objectContaining({ method: 'POST' })));
    expect(await screen.findByText('intake.doneTitle')).toBeInTheDocument();
  });
});
