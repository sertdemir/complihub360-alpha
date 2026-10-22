import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadBetaState, markBetaAccepted, resetAgreementGate } from './agreementGate';

const { fetchMyAgreements } = vi.hoisted(() => ({ fetchMyAgreements: vi.fn() }));
vi.mock('../api/agreements', () => ({ fetchMyAgreements: (...a: unknown[]) => fetchMyAgreements(...a) }));

const state = (required: boolean) => ({ beta: { agreement: 'beta', currentVersion: 'beta-2026-10', acceptedVersion: required ? null : 'beta-2026-10', acceptedAt: null, language: null, required } });

beforeEach(() => { resetAgreementGate(); fetchMyAgreements.mockReset(); });

describe('agreementGate', () => {
  it('fragt einmal je Sitzung, nicht je Seite', async () => {
    fetchMyAgreements.mockResolvedValue(state(true));
    const a = await loadBetaState('de');
    const b = await loadBetaState('de');
    expect(a?.required).toBe(true);
    expect(b).toBe(a);
    expect(fetchMyAgreements).toHaveBeenCalledTimes(1);
  });

  it('nach der Annahme ist der Weg frei, ohne neue Abfrage', async () => {
    fetchMyAgreements.mockResolvedValue(state(true));
    await loadBetaState('de');
    markBetaAccepted();
    fetchMyAgreements.mockResolvedValue(state(false));
    expect((await loadBetaState('de'))?.required).toBe(false);
  });

  it('ein Ausfall sperrt niemanden aus', async () => {
    fetchMyAgreements.mockRejectedValue(new Error('offline'));
    expect(await loadBetaState('de')).toBeNull();
  });
});
