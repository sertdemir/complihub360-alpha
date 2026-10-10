import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDrawer } from './ConfirmDrawer';

// C2 (10.10.2026): scheiterte der Schalter in der Kopfzeile, schloss sich der
// Drawer still — der Anbieter hielt sich fuer pausiert. Mit `failure` bleibt
// er offen und sagt es; ohne Fehler schliesst er wie bisher.

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const spec = (onConfirm: () => Promise<void>) => ({ title: 'T', consequence: 'C', confirmLabel: 'OK', failure: 'Nicht gespeichert.', onConfirm });

describe('ConfirmDrawer · failure', () => {
  it('bleibt offen und nennt den Fehler, wenn onConfirm wirft', async () => {
    const onClose = vi.fn();
    render(<ConfirmDrawer spec={spec(() => Promise.reject(new Error('500')))} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nicht gespeichert.');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'OK' })).toBeEnabled();
  });

  it('Gegenprobe: gelingt onConfirm, schliesst er ohne Meldung', async () => {
    const onClose = vi.fn();
    render(<ConfirmDrawer spec={spec(() => Promise.resolve())} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
