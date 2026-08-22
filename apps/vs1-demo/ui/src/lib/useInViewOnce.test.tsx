import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInViewOnce } from './useInViewOnce';

// ─── The reveal must never be able to hide content ───────────────────────────
// Every caller of this hook renders at opacity 0 (or width 0) until it says
// otherwise. So the property under test is not "it animates nicely" — it is
// "it cannot get stuck on false". A stuck reveal is indistinguishable from a
// section that was never rendered: no error, no empty state, nothing in the
// console. That is the failure this file exists to make impossible.

function Probe() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="probe">
      {inView ? 'visible' : 'hidden'}
    </div>
  );
}

type Cb = (entries: { isIntersecting: boolean }[]) => void;

/** Installs a fake IntersectionObserver and returns a handle on its callback. */
function installObserver(behaviour: 'silent' | 'reports-offscreen' | 'reports-onscreen') {
  const observed: Element[] = [];
  class FakeIO {
    constructor(private cb: Cb) {}
    observe(el: Element) {
      observed.push(el);
      if (behaviour === 'silent') return;
      this.cb([{ isIntersecting: behaviour === 'reports-onscreen' }]);
    }
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal('IntersectionObserver', FakeIO);
  return observed;
}

describe('useInViewOnce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // happy-dom has no matchMedia in every version; the hook tolerates that
    // via optional call, but pin it so these tests measure the observer path
    // rather than the reduced-motion shortcut.
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reveals anyway when the observer never calls back', () => {
    installObserver('silent');
    render(<Probe />);

    // The whole bug class in one assertion: before the deadline the content is
    // legitimately still hidden…
    expect(screen.getByTestId('probe')).toHaveTextContent('hidden');

    // …and after it, it is on screen regardless of the observer's silence.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('probe')).toHaveTextContent('visible');
  });

  it('reveals when constructing the observer throws', () => {
    vi.stubGlobal('IntersectionObserver', class {
      constructor() {
        throw new Error('blocked');
      }
    });
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('visible');
  });

  it('reveals immediately where there is no IntersectionObserver at all', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('visible');
  });

  it('reveals immediately under prefers-reduced-motion', () => {
    installObserver('silent');
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduced-motion') }));
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('visible');
  });

  it('keeps the animation for a working observer that reports off-screen', () => {
    installObserver('reports-offscreen');
    render(<Probe />);

    // A callback arrived, so the observer has proven itself: the deadline is
    // dropped and the element waits for the scroll instead of fading in early.
    // Without this the reveal would be cosmetic — everything below the fold
    // would light up a second after load.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('probe')).toHaveTextContent('hidden');
  });

  it('reveals at once when the element is already on screen', () => {
    installObserver('reports-onscreen');
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('visible');
  });
});
