import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { NewsletterBand } from './NewsletterBand';

// ─── Newsletter · Regel V2 (11.10.2026) ──────────────────────────────────────
// Vorher tat "Abonnieren" mit ungueltiger Adresse schlicht nichts. Jetzt steht
// der Satz am Feld, der Fokus geht hinein.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));
vi.mock('../../lib/supabase', () => ({
  getSupabase: vi.fn().mockResolvedValue(null),
  isSupabaseConfigured: false,
}));

beforeAll(() => {
  // jsdom kennt keinen IntersectionObserver (whileInView der Karte).
  if (!('IntersectionObserver' in window)) {
    class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
    Object.assign(window, { IntersectionObserver: IO });
  }
});

describe('NewsletterBand · Fehler am Feld (V2)', () => {
  it('ungueltige Adresse: Satz am Feld, Fokus im Feld, nicht abonniert', () => {
    render(<NewsletterBand />);
    fireEvent.change(screen.getByLabelText('newsletter.emailAria'), { target: { value: 'anna@' } });
    const knopf = screen.getByRole('button', { name: 'newsletter.subscribe' });
    expect(knopf).toBeEnabled();
    fireEvent.click(knopf);

    const email = screen.getByLabelText('newsletter.emailAria');
    expect(screen.getByRole('alert')).toHaveTextContent('common:contactSend.field.email');
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', 'newsletter-email-error');
    expect(screen.queryByText('newsletter.success')).not.toBeInTheDocument();
  });

  it('gueltige Adresse: abonniert, kein Fehler', () => {
    render(<NewsletterBand />);
    fireEvent.change(screen.getByLabelText('newsletter.emailAria'), { target: { value: 'anna@firma.de' } });
    fireEvent.click(screen.getByRole('button', { name: 'newsletter.subscribe' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('newsletter.success')).toBeInTheDocument();
  });
});
