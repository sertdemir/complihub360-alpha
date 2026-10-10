import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearExpired, markIntentionalLogout, noteSessionExpired, readExpired, resetIntentionalLogout,
  safeReturnPath, takeReturnTo,
} from './sessionExpiry';

// G2: der Hinweis "Your session has expired" darf nur nach einem echten Ablauf
// stehen, und der Ruecksprung darf nur innerhalb der App fuehren.
describe('sessionExpiry', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetIntentionalLogout();
  });

  it('merkt Adresse und Ruecksprung nach einem Ablauf', () => {
    noteSessionExpired('alex@acme.example', '/en/dashboard/termine?x=1');
    expect(readExpired()).toEqual({ email: 'alex@acme.example', returnTo: '/en/dashboard/termine?x=1' });
    expect(takeReturnTo()).toBe('/en/dashboard/termine?x=1');
    expect(takeReturnTo()).toBeNull();
  });

  it('gewolltes Abmelden ist kein Ablauf — auch nicht im zweiten Tab', () => {
    markIntentionalLogout();
    noteSessionExpired('a@b.example', '/en/dashboard');
    expect(readExpired()).toBeNull();
    resetIntentionalLogout();
    // Der zweite Tab kennt die Modul-Marke nicht, nur den Speicher.
    noteSessionExpired('a@b.example', '/en/dashboard');
    expect(readExpired()).toBeNull();
  });

  it('fuehrt nie aus der App heraus', () => {
    expect(safeReturnPath('https://evil.example')).toBeNull();
    expect(safeReturnPath('//evil.example/x')).toBeNull();
    expect(safeReturnPath('/\\evil')).toBeNull();
    expect(safeReturnPath('/en/login?redirect=/x')).toBeNull();
    expect(safeReturnPath('/en/dashboard')).toBe('/en/dashboard');
  });

  it('ein alter Ruecksprung fuehrt nirgends hin', () => {
    noteSessionExpired(null, '/en/dashboard');
    expect(takeReturnTo(Date.now() + 2 * 60 * 60 * 1000)).toBeNull();
  });

  it('clearExpired raeumt den Hinweis', () => {
    noteSessionExpired(null, '/en/dashboard');
    clearExpired();
    expect(readExpired()).toBeNull();
  });
});
