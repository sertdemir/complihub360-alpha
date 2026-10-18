import { describe, it, expect } from 'vitest';
import { readAuthLinkParams, stripAuthLinkParams } from './authLink';

describe('readAuthLinkParams', () => {
  it('token_hash mit gueltigem Typ wird eingeloest', () => {
    expect(readAuthLinkParams('?token_hash=abc&type=email', '')).toEqual({ kind: 'token_hash', tokenHash: 'abc', type: 'email' });
    expect(readAuthLinkParams('?token_hash=abc&type=recovery', '')).toEqual({ kind: 'token_hash', tokenHash: 'abc', type: 'recovery' });
  });

  it('Gegenprobe: unbekannter Typ ist kein einloesbarer Link', () => {
    expect(readAuthLinkParams('?token_hash=abc&type=bogus', '').kind).toBe('none');
  });

  it('otp_expired heisst abgelaufen, alles andere ungueltig — aus Query wie aus Hash', () => {
    expect(readAuthLinkParams('', '#error=access_denied&error_code=otp_expired')).toEqual({ kind: 'error', reason: 'expired' });
    expect(readAuthLinkParams('?error=server_error&error_code=bad_code_verifier', '')).toEqual({ kind: 'error', reason: 'invalid' });
  });

  it('PKCE-Code und leere URL', () => {
    expect(readAuthLinkParams('?code=xyz', '').kind).toBe('code');
    expect(readAuthLinkParams('', '').kind).toBe('none');
  });
});

describe('stripAuthLinkParams', () => {
  it('nimmt nur die Einmal-Parameter heraus', () => {
    expect(stripAuthLinkParams('https://beta.example/de/results?token_hash=a&type=email&q=vat')).toBe('/de/results?q=vat');
  });
});
