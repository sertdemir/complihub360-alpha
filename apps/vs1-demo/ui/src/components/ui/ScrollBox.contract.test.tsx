import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScrollBox } from './ScrollBox';

// ─── ScrollBox · Compass "Scroll Box" (Canvas-Wahl 2A) ───────────────────────
// Ein scrollender Bereich ohne fokussierbaren Inhalt ist per Tastatur nur
// lesbar, wenn er selbst fokussierbar ist und einen Namen traegt. Der Auslauf
// zeigt "es geht weiter" und muss am Textende verschwinden.
// (jsdom misst nicht: scrollHeight und clientHeight werden im Test gesetzt.)

function sizes(el: HTMLElement, { scrollHeight, clientHeight, scrollTop = 0 }: { scrollHeight: number; clientHeight: number; scrollTop?: number }) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
  el.scrollTop = scrollTop;
}

describe('ScrollBox', () => {
  it('ist ein benannter Bereich und mit der Tastatur erreichbar', () => {
    render(<ScrollBox label="Beta-Vereinbarung, zehn Punkte">Text</ScrollBox>);
    const bereich = screen.getByRole('region', { name: 'Beta-Vereinbarung, zehn Punkte' });
    expect(bereich).toHaveAttribute('tabindex', '0');
    expect(bereich).toHaveTextContent('Text');
  });

  it('zeigt den Auslauf, solange Text folgt, und nimmt ihn am Ende weg', () => {
    render(<ScrollBox label="Blatt">Langer Text</ScrollBox>);
    const bereich = screen.getByRole('region', { name: 'Blatt' });
    expect(screen.queryByTestId('scrollbox-fade')).toBeNull();

    sizes(bereich, { scrollHeight: 600, clientHeight: 200 });
    fireEvent.scroll(bereich);
    expect(screen.getByTestId('scrollbox-fade')).toHaveAttribute('aria-hidden', 'true');

    sizes(bereich, { scrollHeight: 600, clientHeight: 200, scrollTop: 400 });
    fireEvent.scroll(bereich);
    expect(screen.queryByTestId('scrollbox-fade')).toBeNull();
  });

  it('passt der Inhalt ganz hinein, gibt es keinen Auslauf', () => {
    render(<ScrollBox label="Blatt">Kurz</ScrollBox>);
    const bereich = screen.getByRole('region', { name: 'Blatt' });
    sizes(bereich, { scrollHeight: 120, clientHeight: 200 });
    fireEvent.scroll(bereich);
    expect(screen.queryByTestId('scrollbox-fade')).toBeNull();
  });

  it('fade={false} schaltet den Auslauf ganz ab', () => {
    render(<ScrollBox label="Blatt" fade={false}>Langer Text</ScrollBox>);
    const bereich = screen.getByRole('region', { name: 'Blatt' });
    sizes(bereich, { scrollHeight: 600, clientHeight: 200 });
    act(() => { fireEvent.scroll(bereich); });
    expect(screen.queryByTestId('scrollbox-fade')).toBeNull();
  });

  it('der Auslauf faengt keine Klicks ab', () => {
    render(<ScrollBox label="Blatt">Langer Text</ScrollBox>);
    const bereich = screen.getByRole('region', { name: 'Blatt' });
    sizes(bereich, { scrollHeight: 600, clientHeight: 200 });
    fireEvent.scroll(bereich);
    expect(screen.getByTestId('scrollbox-fade')).toHaveClass('pointer-events-none');
  });
});
