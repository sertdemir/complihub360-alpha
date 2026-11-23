import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eventUrl, normalizePath, track, trackPageview, trackScrollDepth } from './analytics';

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

  it('never carries an identifier in the path, whatever the caller hands in', () => {
    const stop = trackScrollDepth('/de/dashboard/booking/3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d');
    scrollTo(3_000);
    stop();
    expect(sent[0].props?.path).toBe('/de/dashboard/booking');
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

// ─── Addresses without identifiers ────────────────────────────────────────────
// Found on 2026-11-20: the booking confirmation wrote the booking id into every
// pageview. An id in an analytics path can be joined with our database to one
// account. These tests pin what may leave the browser.

const BOOKING_ID = '3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d';
const PROVIDER_REF = 'a1b2c3d4e5f6';

describe('normalizePath', () => {
  it.each([
    [`/de/dashboard/booking/${BOOKING_ID}`, '/de/dashboard/booking'],
    [`/en/p/${PROVIDER_REF}`, '/en/p'],
    [`/en/p/${PROVIDER_REF}/schedule`, '/en/p/schedule'],
    ['/tr/admin/providers/tp-21-pellion', '/tr/admin/providers'],
  ])('drops the identifier from %s', (given, expected) => {
    expect(normalizePath(given)).toBe(expected);
  });

  it.each([
    '/de',
    '/de/wizard',
    '/en/results',
    '/es/dashboard/termine',
    '/de/markets/DE',
    '/de/compliance/tax-vat',
    '/de/dashboard/workbench/packaging',
    '/de/admin/providers',
  ])('leaves %s as it is', (path) => {
    expect(normalizePath(path)).toBe(path);
  });

  it('drops a UUID or long hex token on a route nobody listed', () => {
    expect(normalizePath(`/de/dashboard/somewhere-new/${BOOKING_ID}/details`)).toBe('/de/dashboard/somewhere-new/details');
    expect(normalizePath('/de/intake/0123456789abcdef0123456789abcdef')).toBe('/de/intake');
  });

  it('ignores a trailing slash and survives the bare root', () => {
    expect(normalizePath('/de/wizard/')).toBe('/de/wizard');
    expect(normalizePath('/')).toBe('/');
  });
});

describe('eventUrl', () => {
  it('keeps campaign parameters and nothing else from the query', () => {
    const url = eventUrl('/de/results', '?token_hash=secret&utm_source=newsletter&session=abc&utm_campaign=beta&redirect=%2Fde%2Fdashboard');
    expect(url).toBe(`${window.location.origin}/de/results?utm_source=newsletter&utm_campaign=beta`);
  });

  it('has no query at all when there is no campaign parameter', () => {
    expect(eventUrl('/de/auth/callback', '?token_hash=secret&type=magiclink')).toBe(`${window.location.origin}/de/auth/callback`);
  });
});

describe('trackPageview', () => {
  afterEach(() => { delete window.plausible; });

  it('reports the page with the cleaned address', () => {
    const spy = vi.fn();
    window.plausible = spy;
    trackPageview(`/de/dashboard/booking/${BOOKING_ID}`);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('pageview', { u: `${window.location.origin}/de/dashboard/booking` });
  });

  it('does not count a path that only redirects — the root, a path without locale', () => {
    const spy = vi.fn();
    window.plausible = spy;
    trackPageview('/');
    trackPageview('/results');
    expect(spy).not.toHaveBeenCalled();
  });

  it('is a no-op when analytics is not loaded, and never throws', () => {
    expect(() => trackPageview('/de')).not.toThrow();
    window.plausible = () => { throw new Error('blocked by an ad blocker'); };
    expect(() => trackPageview('/de')).not.toThrow();
  });
});

describe('track', () => {
  const here = () => `${window.location.origin}${normalizePath(window.location.pathname)}`;

  afterEach(() => { delete window.plausible; });

  it('forwards event and props, filed under the cleaned address', () => {
    const spy = vi.fn();
    window.plausible = spy;
    track('Scroll Depth', { depth: '50%' });
    expect(spy).toHaveBeenCalledWith('Scroll Depth', { u: here(), props: { depth: '50%' } });
  });

  it('sends the address alone when there are no props', () => {
    const spy = vi.fn();
    window.plausible = spy;
    track('Signup');
    expect(spy).toHaveBeenCalledWith('Signup', { u: here() });
  });

  it('never lets an analytics failure reach the page', () => {
    window.plausible = () => { throw new Error('blocked by an ad blocker'); };
    expect(() => track('Signup')).not.toThrow();
  });
});
