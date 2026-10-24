import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { NewsletterBand } from './NewsletterBand';

// ─── Newsletter · Coming in beta (24.10.2026) ────────────────────────────────
// Hinter dem Formular gibt es noch keinen Versand. Bis 24.10. meldete es nach
// dem Klick trotzdem eine Anmeldung. Jetzt ist es sichtbar, aber gesperrt, und
// sagt warum.

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

describe('NewsletterBand · Coming in beta', () => {
  it('Feld und Knopf sind gesperrt, das Etikett sagt Coming in beta', () => {
    render(<NewsletterBand />);
    expect(screen.getByLabelText('newsletter.emailAria')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'newsletter.subscribe' })).toBeDisabled();
    expect(screen.getByText('beyond.pills.beta')).toBeInTheDocument();
  });

  it('der Grund steht am Formular, und kein Klick meldet eine Anmeldung', () => {
    const { container } = render(<NewsletterBand />);
    const form = container.querySelector('form')!;
    expect(form).toHaveAttribute('aria-describedby', 'newsletter-beta-note');
    expect(document.getElementById('newsletter-beta-note')).toHaveTextContent('newsletter.betaNote');
    fireEvent.submit(form);
    expect(screen.queryByText('newsletter.success')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
