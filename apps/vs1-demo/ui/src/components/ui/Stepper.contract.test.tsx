import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Stepper } from './Stepper';

// ─── Stepper variant="inline" · Compass "Step Inline" (Canvas-Wahl 1A) ───────
// Die Textzeile sagt, wo jemand im Ablauf steht. Der Stand darf nie allein an
// der Farbe haengen: erledigt traegt einen Haken, aktiv aria-current="step".

const STEPS = [{ label: 'Anmeldung' }, { label: 'Beta-Vereinbarung' }, { label: 'Ihre Risk Map' }];

describe('Stepper inline', () => {
  it('ist eine benannte Liste, der aktive Schritt traegt aria-current', () => {
    render(<Stepper variant="inline" steps={STEPS} current={1} aria-label="Schritte" />);
    const liste = screen.getByRole('list', { name: 'Schritte' });
    const aktiv = within(liste).getByText('Beta-Vereinbarung').closest('li');
    expect(aktiv).toHaveAttribute('aria-current', 'step');
    expect(within(liste).getByText('Anmeldung').closest('li')).not.toHaveAttribute('aria-current');
    expect(within(liste).getByText('Ihre Risk Map').closest('li')).not.toHaveAttribute('aria-current');
  });

  it('nummeriert die Schritte, ausser das Label traegt die Nummer schon', () => {
    const { rerender } = render(<Stepper variant="inline" steps={STEPS} current={0} />);
    expect(screen.getByText('Anmeldung').closest('li')).toHaveTextContent('1Anmeldung');
    rerender(<Stepper variant="inline" numbered={false} steps={[{ label: '1 Anmeldung' }, { label: '2 Blatt' }]} current={0} />);
    expect(screen.getByText('1 Anmeldung').closest('li')).toHaveTextContent(/^1 Anmeldung$/);
  });

  it('erledigte Schritte tragen einen Haken mit Namen, sobald doneLabel gesetzt ist', () => {
    render(<Stepper variant="inline" steps={STEPS} current={2} doneLabel="erledigt" />);
    expect(screen.getAllByRole('img', { name: 'erledigt' })).toHaveLength(2);
    // Der aktive und kommende Schritte haben keinen Haken.
    expect(within(screen.getByText('Ihre Risk Map').closest('li')!).queryByRole('img')).toBeNull();
  });

  it('ohne doneLabel ist der Haken Zier und taucht im Zugaenglichkeitsbaum nicht auf', () => {
    render(<Stepper variant="inline" steps={STEPS} current={1} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Anmeldung').closest('li')!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('die Trenner sind Zier: der Screenreader zaehlt drei Schritte, nicht fuenf', () => {
    render(<Stepper variant="inline" steps={STEPS} current={0} aria-label="Schritte" />);
    expect(within(screen.getByRole('list', { name: 'Schritte' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('die Kreis-Variante bleibt der Standard und unveraendert', () => {
    render(<Stepper steps={STEPS} current={1} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('›')).toBeNull();
  });
});
