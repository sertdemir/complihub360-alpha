import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveProgressContent } from './MarketsDrawer';
import type { SearchProfile } from '../wizard/WizardContext';

// ─── Save progress (Wizard-Audit B7a · B7b, 23.10.2026) ──────────────────────
// signInWithOtp meldet Fehler im Ergebnis statt per throw. Bis hierher stand
// deshalb bei jedem Fehler "Check your inbox — Your progress is safe.", und
// gesichert war nichts: der Wizard-Stand lebte nur im Speicher.

const signInWithOtp = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: vi.fn().mockResolvedValue({ auth: { signInWithOtp: (...a: unknown[]) => signInWithOtp(...a) } }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
}));

const DRAFT = { country: 'DE', markets: ['DE'], categories: ['tax-vat'] } as unknown as SearchProfile;

const send = (draft?: SearchProfile) => {
  render(<SaveProgressContent onClose={vi.fn()} draft={draft} />);
  fireEvent.change(screen.getByLabelText('account.workEmail'), { target: { value: 'ich@firma.example' } });
  fireEvent.click(screen.getByRole('button', { name: /account\.saveProgress\.cta/ }));
};

describe('SaveProgressContent', () => {
  beforeEach(() => {
    signInWithOtp.mockReset();
    localStorage.clear();
  });

  it('B7a: a failed send says so at the field and shows no success', async () => {
    signInWithOtp.mockResolvedValue({ error: { message: 'rate limit' } });
    send(DRAFT);
    expect(await screen.findByText('account.sendFailed')).toBeInTheDocument();
    expect(screen.queryByText('account.checkInbox')).not.toBeInTheDocument();
    expect(localStorage.getItem('ch360_last_profile')).toBeNull();
  });

  it('B7b: a sent link keeps the draft, and only then promises it is safe', async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    send(DRAFT);
    expect(await screen.findByText('account.checkInbox')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ch360_last_profile') || 'null')).toMatchObject({ markets: ['DE'] });
    expect(screen.getByText(/account\.saveProgress\.confirm/)).toBeInTheDocument();
  });

  it('B7b: without a market there is nothing to keep — no "progress is safe"', async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    send({ ...DRAFT, markets: [] });
    expect(await screen.findByText('account.checkInbox')).toBeInTheDocument();
    expect(localStorage.getItem('ch360_last_profile')).toBeNull();
    expect(screen.queryByText(/account\.saveProgress\.confirm/)).not.toBeInTheDocument();
    expect(screen.getByText(/account\.freeAccount\.confirm/)).toBeInTheDocument();
  });
});
