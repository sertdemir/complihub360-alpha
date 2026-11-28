import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssistantWidget } from './AssistantWidget';

// ─── USt-Assistent, Redesign 28.11.2026 ─────────────────────────────────────
// Das Widget folgt dem Theme (kein erzwungenes `dark`), der Goldbogen läuft
// nur begrenzt, Denken ist eine Statusblase, Quellen sind eine Liste.
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../store/useAuthStore', () => ({ useAuthStore: () => ({ user: null }) }));
const askAssistant = vi.hoisted(() => vi.fn());
vi.mock('../../api/assistant', () => ({
  assistantEnabled: () => true,
  askAssistant: (...a: unknown[]) => askAssistant(...a),
  createAssistantCheckout: vi.fn(),
  verifyAssistantSubscription: vi.fn(),
}));

beforeEach(() => { askAssistant.mockReset(); });

describe('AssistantWidget', () => {
  it('erzwingt kein dunkles Theme', () => {
    const { container } = render(<AssistantWidget />);
    fireEvent.click(screen.getByLabelText('assistant.open'));
    expect(container.querySelector('.dark')).toBeNull();
    expect(container.innerHTML).not.toMatch(/text-white|#0e6450/);
  });

  it('lässt den Goldbogen drei Runden laufen und danach nur auf Hover einmal', () => {
    render(<AssistantWidget />);
    const orbit = () => screen.getByTestId('assistant-orbit');
    expect(orbit().className).toContain('assistant-orbit');
    expect(orbit().style.animationIterationCount).toBe('3');
    fireEvent.animationEnd(orbit());
    expect(orbit().className).not.toContain('assistant-orbit');
    fireEvent.mouseEnter(screen.getByLabelText('assistant.open'));
    expect(orbit().className).toContain('assistant-orbit');
    expect(orbit().style.animationIterationCount).toBe('1');
  });

  it('zeigt beim Denken eine Statusblase und Quellen als Liste', async () => {
    let resolve: (v: unknown) => void = () => {};
    askAssistant.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<AssistantWidget />);
    fireEvent.click(screen.getByLabelText('assistant.open'));
    fireEvent.change(screen.getByPlaceholderText('assistant.placeholder'), { target: { value: 'Frist Italien?' } });
    fireEvent.click(screen.getByLabelText('assistant.send'));
    expect(screen.getByRole('status', { name: 'assistant.thinking' })).toBeTruthy();
    resolve({ answer: 'Bis zum 16. des Folgemonats.', sources: [{ label: 'IT facts' }, { label: 'Worldwide VAT Guide' }] });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    const list = screen.getByRole('list', { name: 'assistant.sources' });
    expect(list.querySelectorAll('li')).toHaveLength(2);
  });
});
