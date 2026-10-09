import { describe, it, expect } from 'vitest';
import { resolveDemoLogin } from './supabase';

// Der Demo-Login muss fail-closed sein: Ein Produktions-Build, dem die
// Supabase-Konfiguration fehlt, darf keinen Demo-Login (samt ?as=admin)
// anbieten. Bis 07.10.2026 reichte genau das.

const base = { dev: false, supabaseConfigured: true, demoFlag: false, mockApi: false };

describe('resolveDemoLogin', () => {
  it('Produktion mit Supabase: aus', () => {
    expect(resolveDemoLogin(base)).toBe(false);
  });

  it('Produktion OHNE Supabase-Konfiguration: aus (fail-closed)', () => {
    expect(resolveDemoLogin({ ...base, supabaseConfigured: false })).toBe(false);
  });

  it('Staging mit ausdruecklichem Schalter: an', () => {
    expect(resolveDemoLogin({ ...base, demoFlag: true })).toBe(true);
  });

  it('lokaler Mock: an', () => {
    expect(resolveDemoLogin({ ...base, dev: true, mockApi: true })).toBe(true);
  });

  it('Dev-Server ohne Supabase: an, mit Supabase: aus', () => {
    expect(resolveDemoLogin({ ...base, dev: true, supabaseConfigured: false })).toBe(true);
    expect(resolveDemoLogin({ ...base, dev: true })).toBe(false);
  });
});
