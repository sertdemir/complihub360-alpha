import { describe, it, expect } from 'vitest';
import { ACCOUNT_SWITCHER_KEY, clearLocalAuth, forgetAccount, homeFor, loadAccounts, rememberSession, resolveAccountSwitcher, type SessionLike } from './accountSwitcher';

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m };
}
const sess = (id: string, role?: string, rt = `rt-${id}`): SessionLike => ({
  access_token: `at-${id}`, refresh_token: rt,
  user: { id, email: `${id}@test`, app_metadata: role ? { role } : {} },
});

describe('resolveAccountSwitcher', () => {
  it('nur mit Staging-Schalter UND echter Anmeldung', () => {
    expect(resolveAccountSwitcher({ demoFlag: true, supabaseConfigured: true })).toBe(true);
    expect(resolveAccountSwitcher({ demoFlag: false, supabaseConfigured: true })).toBe(false); // Produktion
    expect(resolveAccountSwitcher({ demoFlag: true, supabaseConfigured: false })).toBe(false); // Mock, keine echten Sitzungen
  });
});

describe('gemerkte Konten', () => {
  it('merkt je Konto die juengste Sitzung, neueste zuerst', () => {
    const s = mem();
    rememberSession(sess('nutzer'), s);
    rememberSession(sess('partner', 'partner'), s);
    rememberSession(sess('nutzer', undefined, 'rt-neu'), s);
    const list = loadAccounts(s);
    expect(list.map((a) => a.userId)).toEqual(['nutzer', 'partner']);
    expect(list[0].refreshToken).toBe('rt-neu');
    expect(list[1].role).toBe('partner');
  });

  it('vergisst ein Konto', () => {
    const s = mem();
    rememberSession(sess('a'), s);
    rememberSession(sess('b'), s);
    expect(forgetAccount('a', s).map((x) => x.userId)).toEqual(['b']);
  });

  it('kaputter Speicher ergibt eine leere Liste statt eines Absturzes', () => {
    const s = mem();
    s.m.set(ACCOUNT_SWITCHER_KEY, '{kaputt');
    expect(loadAccounts(s)).toEqual([]);
  });

  it('haelt hoechstens sechs Konten', () => {
    const s = mem();
    for (let i = 0; i < 8; i++) rememberSession(sess(`u${i}`), s);
    expect(loadAccounts(s)).toHaveLength(6);
  });
});

describe('homeFor', () => {
  it('fuehrt jede Rolle auf ihre Startseite', () => {
    expect(homeFor('partner', 'de')).toBe('/de/partner-dashboard');
    expect(homeFor('user', 'de')).toBe('/de/dashboard');
    expect(homeFor('admin', 'en')).toBe('/en/admin');
  });
});

describe('clearLocalAuth', () => {
  it('entfernt nur die lokale Supabase-Sitzung, nichts anderes', () => {
    const m = new Map<string, string>([
      ['sb-kqyl-auth-token', '{}'], ['sb-kqyl-auth-token-code-verifier', 'x'],
      [ACCOUNT_SWITCHER_KEY, '[]'], ['i18nextLng', 'de'],
    ]);
    const storage = {
      get length() { return m.size; },
      key: (i: number) => [...m.keys()][i] ?? null,
      removeItem: (k: string) => { m.delete(k); },
    };
    expect(clearLocalAuth(storage).sort()).toEqual(['sb-kqyl-auth-token', 'sb-kqyl-auth-token-code-verifier']);
    expect([...m.keys()].sort()).toEqual([ACCOUNT_SWITCHER_KEY, 'i18nextLng'].sort());
  });
});
