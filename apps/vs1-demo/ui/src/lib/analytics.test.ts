import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { track, trackScrollDepth } from './analytics';

// ─── Scroll-depth contract ────────────────────────────────────────────────────
// This exists because the mechanism cannot be verified in a browser from here:
// the headless pane moves window.scrollY without dispatching scroll events and
// never runs requestAnimationFrame, so a manual check silently reports "no
// events" whether the code works or not. These tests drive both by hand.

function setPage({ scrollHeight, innerHeight, scrollY }: { scrollHeight: number; innerHeight: number; scrollY: number }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true, writable: true });
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
  window.dispatchEvent(new Event('scroll'));
  // the module coalesces into one rAF; run whatever it queued
  vi.runAllTimers();
}

describe('trackScrollDepth', () => {
  let sent: Array<{ event: string; props?: Record<string, unknown> }>;

  beforeEach(() => {
    vi.useFakeTimers();
    // happy-dom has no rAF scheduler we can flush — route it through timers.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    sent = [];
    window.plausible = (event, options) => { sent.push({ event, props: options?.props }); };
    setPage({ scrollHeight: 10_000, innerHeight: 1_000, scrollY: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete window.plausible;
  });

  it('reports each milestone once, in order', () => {
    const stop = trackScrollDepth('/de');
    scrollTo(2_700);   // 30 % → 25
    scrollTo(5_400);   // 60 % → 50
    scrollTo(6_800);   // 75.5 % → 75
    scrollTo(8_500);   // 94.4 % → 90
    stop();
    expect(sent.map((s) => s.props?.depth)).toEqual(['25%', '50%', '75%', '90%']);
    expect(sent.every((s) => s.event === 'Scroll Depth')).toBe(true);
  });

  it('does not repeat a milestone the visitor scrolls past twice', () => {
    const stop = trackScrollDepth('/de');
    scrollTo(5_400);
    scrollTo(0);
    scrollTo(5_400);
    stop();
    expect(sent.map((s) => s.props?.depth)).toEqual(['25%', '50%']);
  });

  it('carries the path so depth is readable per page', () => {
    const stop = trackScrollDepth('/de/pricing');
    scrollTo(3_000);
    stop();
    expect(sent[0].props?.path).toBe('/de/pricing');
  });

  it('stays silent on a page that does not scroll', () => {
    setPage({ scrollHeight: 800, innerHeight: 1_000, scrollY: 0 });
    const stop = trackScrollDepth('/de/imprint');
    scrollTo(0);
    stop();
    expect(sent).toEqual([]);
  });

  it('detaches on cleanup — a stale listener would attribute depth to the wrong page', () => {
    const stop = trackScrollDepth('/de');
    stop();
    scrollTo(9_000);
    expect(sent).toEqual([]);
  });

  it('is a no-op when analytics is not loaded', () => {
    delete window.plausible;
    const stop = trackScrollDepth('/de');
    expect(() => scrollTo(9_000)).not.toThrow();
    stop();
  });
});

describe('track', () => {
  afterEach(() => { delete window.plausible; });

  it('forwards event and props', () => {
    const spy = vi.fn();
    window.plausible = spy;
    track('Scroll Depth', { depth: '50%' });
    expect(spy).toHaveBeenCalledWith('Scroll Depth', { props: { depth: '50%' } });
  });

  it('omits the options object when there are no props', () => {
    const spy = vi.fn();
    window.plausible = spy;
    track('Signup');
    expect(spy).toHaveBeenCalledWith('Signup', undefined);
  });

  it('never lets an analytics failure reach the page', () => {
    window.plausible = () => { throw new Error('blocked by an ad blocker'); };
    expect(() => track('Signup')).not.toThrow();
  });
});
