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

  // Staging 24.10.2026: aeltere Migrationen stehen mit dem Zeitstempel des
  // Einspielens und blossem Namen in der Tabelle. Nur ueber Zeitstempel waeren
  // 41 von 63 Dateien "fehlend" gewesen.
  it('erkennt eine Datei auch am Namen, wenn der Zeitstempel ein anderer ist', () => {
    expect(missingMigrations(['20260920000000_provider_data_model.sql'], ['20260922200428', 'name:provider_data_model'])).toEqual([]);
  });

  it('Gegenprobe: anderer Name, anderer Zeitstempel → fehlt', () => {
    expect(missingMigrations(['20260920000000_provider_data_model.sql'], ['20260922200428', 'name:provider_dossier'])).toEqual(['20260920000000_provider_data_model.sql']);
  });
});
