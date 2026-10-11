import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConfirmSpec } from './ConfirmDrawer';

// ─── Integration (API) in den Einstellungen (Phase 7, ADR-0010) ──────────────
// Drei Dinge, die stimmen muessen: unter einem Tarif ohne API gibt es den
// Abschnitt nicht (kein Hinweis, kein Angebot); der Klartext des Schluessels
// steht nur nach dem Erzeugen und verschwindet mit „gespeichert"; Widerrufen
// laeuft ueber den Bestaetigungs-Drawer mit Schluesselwort.

const api = vi.hoisted(() => ({
  fetchApiAccess: vi.fn(),
  requestApiAccess: vi.fn(),
  issueApiKey: vi.fn(),
  revokeApiAccess: vi.fn(),
  fetchApiAccessLog: vi.fn(),
}));
vi.mock('../../api/apiAccess', () => ({
  fetchApiAccess: () => api.fetchApiAccess(),
  requestApiAccess: (b: unknown) => api.requestApiAccess(b),
  issueApiKey: () => api.issueApiKey(),
  revokeApiAccess: () => api.revokeApiAccess(),
  fetchApiAccessLog: () => api.fetchApiAccessLog(),
  REQUESTABLE_SCOPES: ['leads:read', 'leads:write', 'events:read', 'billing:read'],
}));
vi.mock('../../api/client', () => ({ ApiError: class extends Error { body = {}; } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts && 'defaultValue' in opts ? String(opts.defaultValue) : key), i18n: { resolvedLanguage: 'de' } }),
}));

import { ApiAccessPanel } from './ApiAccessPanel';

const base = { ok: true, eligible: true, plan_code: 'global', terms_version: 'api-terms-v1', requestable_scopes: ['leads:read', 'leads:write', 'events:read', 'billing:read'] };
const client = (over: Record<string, unknown> = {}) => ({
  id: 'c1', name: 'HubSpot CRM', status: 'active', use_case: 'CRM', contact_name: null, contact_email: 'it@k.example', requested_scopes: ['leads:read'], scopes: ['leads:read', 'events:read'],
  rate_limit_per_minute: 120, key_prefix: 'chk_live_7f3a…', key_created_at: '2026-10-11T09:00:00Z', previous_key_valid_until: null, last_used_at: null, approved_at: '2026-10-11T08:00:00Z',
  suspended_at: null, suspended_reason: null, revoked_at: null, decision_note: null, terms_version: 'api-terms-v1', created_at: '2026-10-10T08:00:00Z', ...over,
});

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.fetchApiAccessLog.mockResolvedValue({ ok: true, calls: [], today: { count: 0, limited: 0, failed: 0 }, events: [] });
});

describe('ApiAccessPanel', () => {
  it('rendert NICHTS, wenn der Tarif die API nicht enthaelt — kein Hinweis, kein Angebot', async () => {
    api.fetchApiAccess.mockResolvedValue({ ...base, eligible: false, plan_code: 'growth', client: null });
    const onEligibility = vi.fn();
    const { container } = render(<ApiAccessPanel onConfirm={() => {}} onEligibility={onEligibility} />);
    await waitFor(() => expect(onEligibility).toHaveBeenCalledWith(false));
    expect(container.textContent).toBe('');
    expect(screen.queryByText(/apiAccess\./)).toBeNull();
  });

  it('ohne Client: der Antrag braucht Name, Zweck, Kontakt, Scopes und die Bedingungen', async () => {
    api.fetchApiAccess.mockResolvedValue({ ...base, client: null });
    api.requestApiAccess.mockResolvedValue(client({ status: 'requested', scopes: [] }));
    render(<ApiAccessPanel onConfirm={() => {}} />);
    const submit = await screen.findByRole('button', { name: 'apiAccess.submit' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('apiAccess.namePh'), { target: { value: 'HubSpot CRM' } });
    fireEvent.change(screen.getByPlaceholderText('apiAccess.useCasePh'), { target: { value: 'Leads ins CRM' } });
    fireEvent.change(screen.getByPlaceholderText('it@example.com'), { target: { value: 'it@k.example' } });
    expect(submit).toBeDisabled(); // Bedingungen fehlen noch
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[boxes.length - 1]!);
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() => expect(api.requestApiAccess).toHaveBeenCalledWith(expect.objectContaining({ name: 'HubSpot CRM', contact_email: 'it@k.example', accept_terms: true, requested_scopes: ['leads:read', 'events:read'] })));
    expect(await screen.findByText('apiAccess.status.requested')).toBeInTheDocument();
  });

  it('freigegeben: der Schluessel erscheint einmal im Klartext und verschwindet mit „gespeichert"', async () => {
    api.fetchApiAccess.mockResolvedValue({ ...base, client: client({ status: 'approved', key_prefix: null }) });
    api.issueApiKey.mockResolvedValue({ ok: true, key: 'chk_live_' + 'a'.repeat(48), shown_once: true, previous_key_valid_until: null, client: client() });
    render(<ApiAccessPanel onConfirm={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'apiAccess.createKey' }));
    expect(await screen.findByText('chk_live_' + 'a'.repeat(48))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'apiAccess.saved' }));
    expect(screen.queryByText('chk_live_' + 'a'.repeat(48))).toBeNull();
    expect(screen.getByText('apiAccess.status.active')).toBeInTheDocument();
    expect(screen.getByText('apiAccess.rotate')).toBeInTheDocument();
  });

  it('aktiv: Widerrufen geht ueber den Drawer mit Schluesselwort; danach ist der Client weg und ein Antrag moeglich', async () => {
    api.fetchApiAccess.mockResolvedValue({ ...base, client: client() });
    api.revokeApiAccess.mockResolvedValue(client({ status: 'revoked' }));
    let spec: ConfirmSpec | null = null;
    render(<ApiAccessPanel onConfirm={(s) => { spec = s; }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'apiAccess.revoke' }));
    expect(spec).not.toBeNull();
    expect(spec!.keyword).toBe('apiAccess.revokeKeyword');
    await spec!.onConfirm();
    expect(api.revokeApiAccess).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'apiAccess.submit' })).toBeInTheDocument();
  });

  it('ausgesetzt: der Grund des Teams steht da, kein Schluessel-Kasten, keine Rotation', async () => {
    api.fetchApiAccess.mockResolvedValue({ ...base, client: client({ status: 'suspended', suspended_at: '2026-10-12T08:00:00Z', suspended_reason: 'Abruf weit ueber dem Zweck' }) });
    render(<ApiAccessPanel onConfirm={() => {}} />);
    expect(await screen.findByText('apiAccess.suspendedBody')).toBeInTheDocument();
    expect(screen.queryByText('apiAccess.rotate')).toBeNull();
  });
});
