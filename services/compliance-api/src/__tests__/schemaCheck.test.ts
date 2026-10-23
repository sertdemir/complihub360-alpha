import { describe, expect, it, vi } from 'vitest';

vi.mock('../supabase.js', () => ({ supabaseApi: { rpc: vi.fn() } }));
import { missingMigrations } from '../schemaCheck.js';

// Beta 23.10.2026: sieben Migrationen fehlten, die Buchung brach ab.
describe('missingMigrations', () => {
  const files = ['20261012000000_enterprise_api.sql', '20261018000100_ledger_request_key.sql', '20261023000000_booking_shared_release.sql'];

  it('nennt genau die Dateien, deren Version fehlt', () => {
    expect(missingMigrations(files, ['20261012000000'])).toEqual(['20261018000100_ledger_request_key.sql', '20261023000000_booking_shared_release.sql']);
  });

  it('Gegenprobe: alles da, nichts fehlt', () => {
    expect(missingMigrations(files, ['20261012000000', '20261018000100', '20261023000000'])).toEqual([]);
  });

  it('Dateien ohne Zeitstempel (README) zaehlen nicht', () => {
    expect(missingMigrations(['README-deprecated.md'], [])).toEqual([]);
  });
});
