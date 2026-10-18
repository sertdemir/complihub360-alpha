import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ApiError } from '../api/client';
import { authFailureFrom, errorCodeOf, errorFieldOf, saveFailureFrom } from './serverErrors';

// ─── Keine rohen Server-Texte (Punkt 2, Wahl M1, 17.10.2026) ─────────────────

const t = (k: string) => k;
const api = (body: Record<string, unknown>, status = 400) => new ApiError('raw server text', status, 'corr-1', '2026-10-17T10:00:00.000Z', body);

describe('errorCodeOf / errorFieldOf', () => {
  it('liest Code und Feld nur aus dem Fehlerkoerper', () => {
    expect(errorCodeOf(api({ errorCode: 'SAME_ADDRESS' }, 409))).toBe('SAME_ADDRESS');
    expect(errorFieldOf(api({ errorCode: 'VALIDATION_ERROR', field: 'new_email' }))).toBe('new_email');
    expect(errorFieldOf(api({ errorCode: 'INTERNAL', field: 'new_email' }, 500))).toBeNull();
    expect(errorCodeOf(new Error('offline'))).toBeNull();
  });
});

describe('authFailureFrom', () => {
  it('ordnet Supabase-Codes Lagen zu, nie Texte', () => {
    expect(authFailureFrom({ code: 'invalid_credentials', status: 400 })).toBe('credentials');
    expect(authFailureFrom({ code: 'email_not_confirmed' })).toBe('unconfirmed');
    expect(authFailureFrom({ code: 'over_email_send_rate_limit' })).toBe('rateLimit');
    expect(authFailureFrom({ status: 429 })).toBe('rateLimit');
    expect(authFailureFrom({ code: 'weak_password' })).toBe('weakPassword');
    expect(authFailureFrom({ code: 'same_password' })).toBe('samePassword');
    expect(authFailureFrom({ code: 'user_already_exists' })).toBe('exists');
    expect(authFailureFrom({ code: 'unexpected_failure' })).toBe('unknown');
    expect(authFailureFrom(null)).toBe('unknown');
  });
});

describe('saveFailureFrom (Bewerbung, L1)', () => {
  it('bekannte Gruende als eigener Satz, alles andere allgemein mit Referenz', () => {
    expect(saveFailureFrom(api({ errorCode: 'SERVICE_CODE_FIXED' }, 409), t)).toEqual({ kind: 'text', text: 'application.errors.serviceCodeFixed' });
    expect(saveFailureFrom(api({ errorCode: 'CATEGORY_ALLOWANCE' }, 422), t)).toEqual({ kind: 'text', text: 'application.services.allowanceError' });
    const g = saveFailureFrom(api({ errorCode: 'INTERNAL' }, 500), t);
    expect(g).toEqual({ kind: 'generic', reference: { id: 'corr-1', at: '2026-10-17T10:00:00.000Z' } });
    expect(JSON.stringify(g)).not.toContain('raw server text');
  });
});

describe('Waechter: kein Server- oder Supabase-Text in der Oberflaeche', () => {
  // Admin-Flaechen sind intern und englisch; dort darf der Server-Text stehen.
  const ROOT = join(__dirname, '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) { if (f !== 'mock' && f !== 'admin') walk(p); }
      else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(ROOT);
  const PATTERNS = [
    /instanceof Error \? \w+\.message/,      // setX(e instanceof Error ? e.message : …)
    /set\w*Error\(\s*error\.message\s*\)/,   // setError(error.message) — Supabase
    /\.test\(\s*\w+\.message\s*\)/,          // Erkennung per Textvergleich
    /readableError\(\s*error\.message/,      // Login: Text statt Code
  ];
  it('findet keine Stelle ausserhalb von Admin', () => {
    const hits = files.flatMap((f) => readFileSync(f, 'utf8').split('\n')
      .map((line, i) => (PATTERNS.some((re) => re.test(line)) ? `${relative(ROOT, f)}:${i + 1}: ${line.trim()}` : null))
      .filter((x): x is string => !!x));
    expect(hits).toEqual([]);
  });
});
