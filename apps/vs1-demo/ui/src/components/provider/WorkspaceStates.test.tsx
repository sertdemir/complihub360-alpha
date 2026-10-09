import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { LoadFailedState, ReadinessEmpty, readinessItems } from './WorkspaceStates';
import { ApiError } from '../../api/client';
import type { Application } from '../../api/application';
import type { SubscriptionView } from '../../api/subscription';

// t() gibt den Schluessel zurueck (mit Werten), geprueft wird die Verdrahtung.
const t = (k: string, o?: Record<string, unknown>) => (o ? `${k}|${JSON.stringify(o)}` : k);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }),
}));

function app(status: Application['provider']['lifecycle_status'], reasons: string[] = []): Application {
  return {
    provider: {
      provider_key: 'k', name: 'n', website_url: null, contact_email: null, languages: [], region: null, active_since: null,
      vat_id: null, vat_id_status: null, vat_id_checked_at: null,
      lifecycle_status: status, lifecycle_status_since: '2026-10-02T00:00:00Z', lifecycle_status_reason: null,
      billing_ready: reasons.length === 0, billing_block_reasons: reasons,
    },
    confidential: null,
    chapters: {} as Application['chapters'],
    services: [{
      id: 's1', service_code: 'tax-vat', service_name: 'USt', description: null, pricing_model: null, price_min: null, price_max: null,
      currency: null, pricing_basis: null, response_time_hours: null, completion_days_estimate: null, capacity_status: 'open', status: 'approved',
      coverage: [
        { id: 'c1', service_id: 's1', country_code: 'DE', jurisdiction_code: null, status: 'approved', limitations: null, approved_at: null, expires_at: null },
        { id: 'c2', service_id: 's1', country_code: 'FR', jurisdiction_code: null, status: 'pending', limitations: null, approved_at: null, expires_at: null },
      ],
    }],
    checklist: [], evidence: [], agreements: [], open_requests: [],
  };
}

const SUB: SubscriptionView = {
  subscription: { plan_code: 'growth', cadence: 'monthly', status: 'active', current_period_start: '2026-10-01', current_period_end: '2026-11-01', started_at: '2026-10-01', renewal_date: '2026-11-01' },
  plans: [{ code: 'growth', label: 'Growth', currency: 'USD', monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3 }],
  released_categories: [{ code: 'tax-vat', label: 'Tax & VAT' }],
  eligibility: { can_start: true, reason: null },
};

const markt = (c: string) => `[${c}]`;

describe('readinessItems (B3)', () => {
  it('aktiv, Tarif, Zahlungsmittel: alles erfuellt, nur freigegebene Maerkte genannt', () => {
    const items = readinessItems(app('active'), SUB, t, markt, 'en')!;
    expect(items.map((i) => [i.key, i.done])).toEqual([['verification', true], ['plan', true], ['payment', true]]);
    expect(items[0].sub).toContain('Tax & VAT');
    expect(items[0].sub).toContain('[DE]');
    expect(items[0].sub).not.toContain('[FR]'); // FR ist nur beantragt
  });

  it('in Pruefung: Verifizierung offen, ohne Aktion', () => {
    const v = readinessItems(app('under_verification'), SUB, t, markt, 'en')![0];
    expect(v).toMatchObject({ key: 'verification', done: false, title: 'common:states.partner.readiness.verifying' });
    expect(v.action).toBeUndefined();
  });

  it('ohne Tarif und ohne Zahlungsmittel: zwei offene Punkte mit Weg', () => {
    const items = readinessItems(app('active', ['no_payment_method']), { ...SUB, subscription: null }, t, markt, 'en')!;
    expect(items[1]).toMatchObject({ done: false, action: { to: 'subscription' } });
    expect(items[2]).toMatchObject({ done: false, action: { to: 'billing' } });
  });

  it('gescheiterte Belastung: keine Zahlungs-Zeile — weder „kein" noch „hinterlegt" waere wahr', () => {
    const items = readinessItems(app('active', ['payment_failed']), SUB, t, markt, 'en')!;
    expect(items.map((i) => i.key)).toEqual(['verification', 'plan']);
  });

  it('Entwurf oder gesperrt: keine Liste — „Verifizierung laeuft" waere falsch', () => {
    for (const s of ['draft', 'paused', 'suspended', 'terminated'] as const) {
      expect(readinessItems(app(s), SUB, t, markt, 'en')).toBeNull();
    }
  });
});

describe('ReadinessEmpty', () => {
  it('zeigt Ueberschrift, Erklaerung und Schlusssatz auch ohne Liste', () => {
    render(<MemoryRouter><ReadinessEmpty kind="appointments" items={null} /></MemoryRouter>);
    expect(screen.getByText('states.partner.empty.appointments')).toBeInTheDocument();
    expect(screen.getByText('states.partner.empty.howBookingWorks')).toBeInTheDocument();
    expect(screen.getByText('states.partner.empty.closing')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('LoadFailedState (A2)', () => {
  it('Ueberschrift je Flaeche, zwei Wege, Referenz-ID aus dem Fehler', () => {
    const onRetry = vi.fn();
    const err = new ApiError('boom', 500, 'ref-1234');
    render(<MemoryRouter><LoadFailedState surface="appointments" error={err} onRetry={onRetry} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'states.partner.loadFailed.appointments' })).toBeInTheDocument();
    expect(screen.getByText('states.partner.loadFailed.message')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'states.actions.tryAgain' }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'states.actions.contactSupport' })).toBeInTheDocument();
    expect(screen.getByText(/states.technicalDetails/)).toBeInTheDocument();
  });
});
