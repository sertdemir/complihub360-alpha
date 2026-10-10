import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── B1 (EN-Launch Schritt 4): der Dialog zeigt, was die Buchung festhaelt ──
// Checklist v1.0 "Data minimization": geteilt wird nur, was der Bestaetigungs-
// bildschirm zeigt. Liegen Werte vom Server vor (shared_preview, spaeter der
// Schnappschuss), zeigt die Liste NUR sie — nie eine zweite Quelle aus dem
// Browser, die vom Geteilten abweichen koennte.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k, i18n: { resolvedLanguage: 'en' } }),
}));

import { useSharedRows } from './SharingReview';
import { useAuthStore } from '../../store/useAuthStore';

const FIELDS = ['email', 'company_name', 'message'];
const browserUser = { email: 'browser@acme.example', user_metadata: { company_name: 'Browserfirma GmbH' } };

afterEach(() => useAuthStore.setState({ user: null } as never));

describe('useSharedRows', () => {
  it('mit Server-Werten: genau diese, nicht die der Browser-Sitzung', () => {
    useAuthStore.setState({ user: browserUser } as never);
    const { result } = renderHook(() => useSharedRows());
    const rows = result.current(FIELDS, { message: 'Hallo', topic: null, preview: { email: 'server@acme.example', company_name: 'Serverfirma GmbH' } });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(byKey).toMatchObject({ email: 'server@acme.example', company_name: 'Serverfirma GmbH', message: 'Hallo' });
    expect(JSON.stringify(rows)).not.toContain('Browserfirma');
  });

  it('fehlt ein Server-Wert, steht "nicht angegeben" — nicht der Wert aus dem Browser', () => {
    useAuthStore.setState({ user: browserUser } as never);
    const { result } = renderHook(() => useSharedRows());
    const rows = result.current(FIELDS, { message: '', topic: null, preview: { email: 'server@acme.example', company_name: null } });
    const company = rows.find((r) => r.key === 'company_name');
    expect(company).toMatchObject({ value: 'results:sharing.notProvided', missing: true });
  });

  it('ohne Server-Werte (Demo, aelterer Server): die Sitzung des Browsers', () => {
    useAuthStore.setState({ user: browserUser } as never);
    const { result } = renderHook(() => useSharedRows());
    const rows = result.current(FIELDS, { message: '', topic: null });
    expect(rows.find((r) => r.key === 'company_name')?.value).toBe('Browserfirma GmbH');
  });
});
