// ─── Feature flags ───────────────────────────────────────────────────────────
// Central on/off switches for surfaces we keep in the codebase but don't ship
// right now. Flipping a flag back to `true` re-enables everything belonging to
// it — route, navigation entries and cross-links — without hunting call sites.

/**
 * Provider marketing landing (/:locale/providers).
 *
 * OFF since 2026-08-09 (decision v2 §D7): providers are recruited offline /
 * B2B and onboard through the token-gated intake link, so a public
 * provider-marketing page has no role in the funnel. The page component and
 * its copy stay in the repo — set this to `true` to bring it back, which
 * restores the route plus the "For Providers" entries in header, footer,
 * global nav and the login page.
 */
export const PROVIDER_MARKETING_ENABLED = false;
