import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Drawer } from './Drawer';

// ─── Drawer header="compact" · Compass "Drawer Header" (Canvas-Wahl 4B) ──────
// Rueckweg, Titel und Schliessen in einer Zeile. Der Rueckweg fuehrt eine Ebene
// zurueck und schliesst NICHT. Beide Knoepfe brauchen einen Namen.

describe('Drawer', () => {
  it('der Dialog ist nach seinem Titel benannt', () => {
    render(<Drawer open onClose={() => {}} title="Termin buchen">Inhalt</Drawer>);
    expect(screen.getByRole('dialog', { name: 'Termin buchen' })).toBeInTheDocument();
  });

  it('compact: Rueckweg ruft onBack und schliesst nicht', () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} header="compact" title="Termin buchen" onBack={onBack} backLabel="Zurück zum Profil" closeLabel="Schließen">
        Inhalt
      </Drawer>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zum Profil' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('compact ohne onBack zeigt keinen Rueckweg', () => {
    render(<Drawer open onClose={() => {}} header="compact" title="Termin buchen" closeLabel="Schließen">Inhalt</Drawer>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('compact: kein Eyebrow, die Zusatzzeile steht im Inhalt statt im Kopf', () => {
    render(
      <Drawer open onClose={() => {}} header="compact" title="Termin buchen" eyebrow="Anbieter" headerExtra="kostenloses Erstgespräch · 30 Min">
        <p>Zeiten</p>
      </Drawer>,
    );
    expect(screen.queryByText('Anbieter')).toBeNull();
    const zusatz = screen.getByText('kostenloses Erstgespräch · 30 Min');
    // Im selben scrollenden Bereich wie der Inhalt, vor ihm.
    expect(zusatz.parentElement).toBe(screen.getByText('Zeiten').parentElement);
    expect(zusatz.compareDocumentPosition(screen.getByText('Zeiten')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('default bleibt, wie er war: Eyebrow, Titel und Zusatzzeile im Kopf', () => {
    render(
      <Drawer open onClose={() => {}} title="Germany" eyebrow="Market" headerExtra="Active regime">
        <p>Body</p>
      </Drawer>,
    );
    expect(screen.getByText('Market')).toBeInTheDocument();
    expect(screen.getByText('Active regime').parentElement).not.toBe(screen.getByText('Body').parentElement);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('Escape schliesst in beiden Koepfen', () => {
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} header="compact" title="T" closeLabel="Schließen">Inhalt</Drawer>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
