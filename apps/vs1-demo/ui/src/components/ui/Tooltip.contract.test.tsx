import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TermTip } from './TermTip';

// ─── Tooltip / TermTip · Checkliste v1.0 und Handover 1.0 §14 ────────────────
// Tooltips muessen mit Tastatur, Fokus, Escape, Touch und Screenreader gehen,
// nicht nur per Hover. (Tailwind laeuft im Unit-Test nicht: geprueft wird die
// Klasse "hidden", nicht die berechnete Sichtbarkeit.)

const TIP = 'Rules covering waste electrical and electronic equipment.';

describe('TermTip', () => {
  it('ist ein Knopf, und die Erklaerung ist schon vor dem Oeffnen als Beschreibung verknuepft', () => {
    render(<TermTip tip={TIP}>WEEE</TermTip>);
    const knopf = screen.getByRole('button', { name: 'WEEE' });
    expect(knopf).toHaveAccessibleDescription(TIP);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveClass('hidden');
  });

  it('Fokus oeffnet, Escape schliesst', () => {
    render(<TermTip tip={TIP}>WEEE</TermTip>);
    const knopf = screen.getByRole('button', { name: 'WEEE' });
    fireEvent.focus(knopf);
    expect(screen.getByRole('tooltip')).not.toHaveClass('hidden');
    expect(screen.getByRole('tooltip')).toHaveTextContent(TIP);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveClass('hidden');
  });

  it('Antippen schaltet um, Antippen daneben schliesst', () => {
    render(<div><TermTip tip={TIP}>WEEE</TermTip><p>daneben</p></div>);
    const knopf = screen.getByRole('button', { name: 'WEEE' });
    fireEvent.pointerUp(knopf, { pointerType: 'touch' });
    expect(screen.getByRole('tooltip')).not.toHaveClass('hidden');
    fireEvent.pointerDown(screen.getByText('daneben'));
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveClass('hidden');
    fireEvent.pointerUp(knopf, { pointerType: 'touch' });
    fireEvent.pointerUp(knopf, { pointerType: 'touch' });
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveClass('hidden');
  });

  it('Hover oeffnet weiterhin', () => {
    render(<TermTip variant="chip" tip={TIP}>WEEE</TermTip>);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'WEEE' }).parentElement!);
    expect(screen.getByRole('tooltip')).not.toHaveClass('hidden');
  });
});
