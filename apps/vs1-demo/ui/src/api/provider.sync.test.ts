import { describe, it, expect, vi } from 'vitest';
import { broadcastAvailability, syncAvailability } from './provider';

// Ein Umschalten ist neuer als jede noch laufende Ladung (18.10.2026). Vorher
// setzte eine spaet eintreffende Anbieter-Zeile eine gerade gespeicherte Pause
// in Einstellungen und Kopfzeile still auf "available" zurueck.
describe('syncAvailability', () => {
  it('uebernimmt die geladene Zeile, solange niemand umgeschaltet hat', () => {
    const set = vi.fn();
    const sync = syncAvailability(set);
    sync.loaded('ooo');
    expect(set).toHaveBeenLastCalledWith('ooo');
    sync.stop();
  });

  it('laesst eine spaete Zeile ein vorheriges Umschalten nicht ueberschreiben', () => {
    const set = vi.fn();
    const sync = syncAvailability(set);
    broadcastAvailability('ooo');
    sync.loaded('available');
    expect(set.mock.calls).toEqual([['ooo']]);
    sync.stop();
  });

  it('folgt weiteren Umschaltungen, auch nach der Ladung', () => {
    const set = vi.fn();
    const sync = syncAvailability(set);
    sync.loaded('available');
    broadcastAvailability('ooo');
    broadcastAvailability('available');
    expect(set.mock.calls).toEqual([['available'], ['ooo'], ['available']]);
    sync.stop();
  });

  it('wirkt nach stop nicht mehr — weder Ereignis noch Ladung', () => {
    const set = vi.fn();
    const sync = syncAvailability(set);
    sync.stop();
    broadcastAvailability('ooo');
    sync.loaded('available');
    expect(set).not.toHaveBeenCalled();
  });
});
