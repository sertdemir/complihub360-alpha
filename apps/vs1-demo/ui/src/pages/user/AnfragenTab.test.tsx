import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnfragenTab } from './AnfragenTab';
import type { UserRequestRow } from '../../api/requests';

// ─── D1 · Antwort ueberfaellig (EN-Launch Schritt 2) ─────────────────────────
// Der abgenommene Zustand erscheint nur, wenn der Anbieter bestaetigt und die
// Antwortfrist gerissen hat. Bei "Expired" waere "You can continue waiting"
// falsch — dort steht er nicht.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
}));
vi.mock('../../components/user/WizardDrawer', () => ({ useWizardDrawer: () => ({ openWizard: vi.fn() }) }));
vi.mock('../../components/shared/ThreadDrawer', () => ({ ThreadDrawer: () => null }));
vi.mock('../../components/user/RequestActionsDrawer', () => ({ RequestActionsDrawer: () => null }));
vi.mock('../../lib/requestContext', () => ({ useRequestContext: () => ({ kontext: () => 'ctx' }) }));

const row = (over: Partial<UserRequestRow>): UserRequestRow => ({
  uuid: 'u1', id: 'RQ-U1', status: 'active', statusLabel: 'Provider confirmed', company: 'Verified tax advisory · Northern Germany',
  meta: 'tax-vat · DE', action: { label: 'View thread', variant: 'secondary' }, bucket: 'confirmed',
  rawStatus: 'confirmed', category: 'tax-vat', country: 'DE', slaDeadline: null, ...over,
});

function renderTab(rows: UserRequestRow[]) {
  return render(
    <MemoryRouter initialEntries={['/en/dashboard/termine']}>
      <Routes>
        <Route path="/:locale/dashboard/termine" element={<AnfragenTab rows={rows} />} />
        <Route path="/:locale/dashboard/workbench/:domain" element={<p>workbench</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const HEADING = 'common:states.providerResponseOverdue.heading';

describe('AnfragenTab · Antwort ueberfaellig (D1)', () => {
  beforeEach(() => localStorage.clear());

  it('zeigt den Zustand, wenn die Antwortfrist nach der Bestaetigung gerissen ist', () => {
    renderTab([row({ slaDeadline: new Date(Date.now() - 3_600_000).toISOString() })]);
    expect(screen.getByText(HEADING)).toBeInTheDocument();
    expect(screen.getByText('common:states.providerResponseOverdue.message')).toBeInTheDocument();
  });

  it('nicht bei laufender Frist und nicht bei "Expired"', () => {
    renderTab([
      row({ uuid: 'a', slaDeadline: new Date(Date.now() + 3_600_000).toISOString() }),
      row({ uuid: 'b', bucket: 'overdue', rawStatus: 'expired', statusLabel: 'Expired' }),
    ]);
    expect(screen.queryByText(HEADING)).not.toBeInTheDocument();
  });

  it('Keep Waiting blendet ihn fuer diese Anfrage aus — dauerhaft im Browser', () => {
    const r = row({ slaDeadline: new Date(Date.now() - 3_600_000).toISOString() });
    const { unmount } = renderTab([r]);
    fireEvent.click(screen.getByRole('button', { name: 'common:states.actions.keepWaiting' }));
    expect(screen.queryByText(HEADING)).not.toBeInTheDocument();
    unmount();
    renderTab([r]);
    expect(screen.queryByText(HEADING)).not.toBeInTheDocument();
  });

  it('See Another Match fuehrt zu den Anbietern des Bereichs', () => {
    renderTab([row({ slaDeadline: new Date(Date.now() - 3_600_000).toISOString() })]);
    fireEvent.click(screen.getByRole('button', { name: 'common:states.actions.seeAnotherMatch' }));
    expect(screen.getByText('workbench')).toBeInTheDocument();
  });
});
