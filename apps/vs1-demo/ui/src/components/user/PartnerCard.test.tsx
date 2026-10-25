import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PartnerCard } from './PartnerCard';
import { prioritiesCoveredBy } from '../../pages/ResultsRiskMap';
import type { AnonProvider, SearchLaw } from '../../api/search';

// ─── Anbieterkarte · Handover 1.0 §5 ─────────────────────────────────────────
// Die anonyme Karte zeigt, was der Vergleich braucht: Expertise, Maerkte,
// abgedeckte Prioritaeten, Preisspanne, Leistungsdauer, abgeschlossene
// Auftraege. Jede Zeile nur mit Daten; die Identitaet nie.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, o?: Record<string, unknown>) => (o && Object.keys(o).length ? `${key}${JSON.stringify(o)}` : key),
    i18n: { resolvedLanguage: 'en' },
  }),
}));

const BASE = {
  public_ref: 'a1b2c3d4e5f6', title: 'Verified Provider A', letter: 'A', descriptor: 'Tax and VAT · Norditalien',
  region: null, active_since: 2015, specializations: ['VAT & OSS', 'E-Commerce', 'EU-weit', 'Vierte'], languages: [],
  rating: null, completed_count: 210, avg_response_hours: 3, billing_model: 'project', is_verified: true,
  match: 100, match_tier: 'high', price_range: { min: 180, max: 450, currency: 'EUR' },
  timeline_days: { min: 10, max: 15 }, markets_covered: ['DE', 'NL'],
  match_basis: { country: 'DE', country_covered: true, domains_requested: ['tax-vat', 'data-privacy'], domains_matched: ['tax-vat'] },
} as unknown as AnonProvider;

describe('PartnerCard · Felder', () => {
  it('zeigt Expertise (hoechstens drei), Maerkte, Prioritaeten, Dauer und Auftraege', () => {
    render(<PartnerCard provider={BASE} onDetails={() => {}} priorities={{ immediate: 2, high: 1 }} />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['VAT & OSS', 'E-Commerce', 'EU-weit']);
    expect(screen.getByText('card.markets:').nextSibling).toHaveTextContent('Germany · Netherlands');
    expect(screen.getByText('card.priorities:').nextSibling).toHaveTextContent('2 priority.immediate · 1 priority.high');
    expect(screen.getByText('card.timeline:').nextSibling).toHaveTextContent('card.daysRange{"min":10,"max":15}');
    expect(screen.getByText('card.completed:').nextSibling).toHaveTextContent('210');
  });

  it('ohne Daten keine Zeile — keine erfundene Dauer, keine 0 Auftraege', () => {
    const p = { ...BASE, timeline_days: null, completed_count: 0, markets_covered: [], specializations: [] } as AnonProvider;
    render(<PartnerCard provider={p} onDetails={() => {}} />);
    expect(screen.queryByText('card.timeline:')).not.toBeInTheDocument();
    expect(screen.queryByText('card.completed:')).not.toBeInTheDocument();
    expect(screen.queryByText('card.markets:')).not.toBeInTheDocument();
    expect(screen.queryByText('card.priorities:')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('gleiche Grenzen: eine Zahl statt Spanne', () => {
    const p = { ...BASE, timeline_days: { min: 7, max: 7 } } as AnonProvider;
    render(<PartnerCard provider={p} onDetails={() => {}} />);
    expect(screen.getByText('card.timeline:').nextSibling).toHaveTextContent('card.days{"count":7}');
  });

  it('mit onBook: "Book a Consultation" bucht, "View details" oeffnet das Profil', () => {
    const onBook = vi.fn(); const onDetails = vi.fn();
    render(<PartnerCard provider={BASE} onDetails={onDetails} onBook={onBook} />);
    fireEvent.click(screen.getByRole('button', { name: 'card.book' }));
    expect(onBook).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'snapshot.providerDetails' }));
    expect(onDetails).toHaveBeenCalledOnce();
  });

  it('Add to Selection: Knopf mit aria-pressed, umschaltbar, Fehler sichtbar', () => {
    const onToggleSave = vi.fn();
    const { rerender } = render(<PartnerCard provider={BASE} onDetails={() => {}} onBook={() => {}} saved={false} onToggleSave={onToggleSave} />);
    const knopf = screen.getByRole('button', { name: 'card.addToSelection' });
    expect(knopf).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(knopf);
    expect(onToggleSave).toHaveBeenCalledOnce();
    rerender(<PartnerCard provider={BASE} onDetails={() => {}} onBook={() => {}} saved onToggleSave={onToggleSave} saveFailed />);
    expect(screen.getByRole('button', { name: 'card.inSelection' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('card.saveFailed');
  });

  it('volle Merkliste: sagt das statt "nochmal versuchen"', () => {
    render(<PartnerCard provider={BASE} onDetails={() => {}} onBook={() => {}} saved={false} onToggleSave={() => {}} saveFailed="full" />);
    expect(screen.getByRole('alert')).toHaveTextContent('card.saveFull');
  });

  it('ohne onToggleSave kein Merken-Knopf (Gast, Merkliste nicht ladbar)', () => {
    render(<PartnerCard provider={BASE} onDetails={() => {}} onBook={() => {}} />);
    expect(screen.queryByRole('button', { name: 'card.addToSelection' })).not.toBeInTheDocument();
  });

  it('nach der Buchung: kein Buchungsknopf mehr', () => {
    render(<PartnerCard provider={BASE} onDetails={() => {}} onBook={() => {}} booking={{ name: 'Studio Bianchi', slotStart: '2026-10-01T09:00:00Z' }} />);
    expect(screen.queryByRole('button', { name: 'card.book' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'snapshot.providerBooked' })).toBeInTheDocument();
  });
});

describe('prioritiesCoveredBy', () => {
  const law = (domain: string, severity: SearchLaw['severity']) => ({ domain, severity } as SearchLaw);
  const laws = [law('tax-vat', 'critical'), law('tax-vat', 'critical'), law('tax-vat', 'high'), law('data-privacy', 'critical'), law('tax-vat', 'low')];

  it('zaehlt nur Pflichten in abgedeckten Bereichen, nach Stufe', () => {
    expect(prioritiesCoveredBy(laws, laws.map(() => ({})), BASE)).toEqual({ immediate: 2, high: 1, low: 1 });
  });

  it('"On the radar" zaehlt nicht', () => {
    expect(prioritiesCoveredBy(laws, [{}, { radar: true }, {}, {}, { radar: true }], BASE)).toEqual({ immediate: 1, high: 1 });
  });

  it('Live-Format: domain als Engine-Enum, PRODUCT getrennt nach Subdomain', () => {
    const live = [
      { id: 'tax-vat-registration', domain: 'TAX', severity: 'critical' },
      { id: 'prod-safety', domain: 'PRODUCT', severity: 'high' },
      { id: 'prod-packaging', domain: 'PRODUCT', severity: 'medium' },
    ] as SearchLaw[];
    const verpackung = { match_basis: { country: 'DE', country_covered: true, domains_requested: ['product-packaging'], domains_matched: ['product-packaging'] } };
    const produkt = { match_basis: { country: 'DE', country_covered: true, domains_requested: ['product-compliance'], domains_matched: ['product-compliance'] } };
    expect(prioritiesCoveredBy(live, live.map(() => ({})), BASE)).toEqual({ immediate: 1 });
    expect(prioritiesCoveredBy(live, live.map(() => ({})), verpackung)).toEqual({ medium: 1 });
    expect(prioritiesCoveredBy(live, live.map(() => ({})), produkt)).toEqual({ high: 1 });
  });

  it('erledigt oder nicht zutreffend zaehlt nicht', () => {
    const live = [
      { id: 'a', domain: 'TAX', severity: 'critical' },
      { id: 'b', domain: 'TAX', severity: 'high' },
    ] as SearchLaw[];
    expect(prioritiesCoveredBy(live, live.map(() => ({})), BASE, new Set(['a']))).toEqual({ high: 1 });
  });

  it('ohne match_basis: nichts', () => {
    expect(prioritiesCoveredBy(laws, laws.map(() => ({})), { match_basis: undefined })).toEqual({});
  });
});
