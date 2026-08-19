#!/usr/bin/env node
/**
 * export-screenshots.mjs — Full-page screenshots of every route of the
 * vs1-demo UI, taken from a LOCAL build. Purpose: hand the site to an
 * external reviewer (e.g. ChatGPT) without opening the staging auth wall.
 *
 *   node scripts/export-screenshots.mjs [--locale de] [--out <dir>] [--dark] [--mobile]
 *
 * Prerequisites: `npm run build --workspace apps/vs1-demo/ui` has produced
 * apps/vs1-demo/ui/dist, and Playwright's Chromium is available (in the
 * remote sandbox it is pre-installed via PLAYWRIGHT_BROWSERS_PATH).
 *
 * Auth: the protected areas (user/partner/admin) are entered via the demo
 * login, which persists in localStorage (demo_is_logged_in / demo_user_role,
 * see src/store/useAuthStore.ts) — so the script simply seeds those keys per
 * role instead of clicking through the login page. Fixture data only.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'apps/vs1-demo/ui/dist');

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
const LOCALE = opt('locale', 'de');
const OUT = resolve(opt('out', join(ROOT, `screenshots-${LOCALE}`)));
const DARK = flag('dark');
const MOBILE = flag('mobile');

// ── Route map: [file-stem, path, role] · role null = public ─────────────────
const ROUTES = [
  ['home', '', null],
  ['platform', 'platform', null],
  ['solutions', 'solutions', null],
  ['compliance-areas', 'compliance', null],
  ['how-it-works', 'how-it-works', null],
  ['pricing', 'pricing', null],
  ['markets-index', 'markets', null],
  ['market-de', 'markets/de', null],
  ['resources', 'resources', null],
  ['ai-governance', 'ai-governance', null],
  ['results-risk-map', 'results', null],
  ['search', 'search?q=datenschutz', null],
  ['wizard-start', 'wizard', null],
  ['login', 'login', null],
  ['register', 'register', null],
  ['provider-intake', 'provider-intake', null],
  ['privacy', 'privacy', null],
  ['imprint', 'imprint', null],
  ['terms', 'terms', null],
  ['cookies', 'cookies', null],
  // user workspace (demo role: user)
  ['user-dashboard', 'dashboard', 'user'],
  ['user-sessions', 'dashboard/sessions', 'user'],
  ['user-requests', 'dashboard/requests', 'user'],
  ['user-termine', 'dashboard/termine', 'user'],
  ['user-notifications', 'dashboard/notifications', 'user'],
  ['user-saved-providers', 'dashboard/saved-providers', 'user'],
  ['user-exports', 'dashboard/exports', 'user'],
  ['user-library', 'dashboard/library', 'user'],
  // partner workspace (demo role: partner)
  ['partner-requests', 'partner-dashboard/requests', 'partner'],
  ['partner-termine', 'partner-dashboard/termine', 'partner'],
  ['partner-performance', 'partner-dashboard/performance', 'partner'],
  ['partner-coverage', 'partner-dashboard/coverage', 'partner'],
  ['partner-billing', 'partner-dashboard/billing', 'partner'],
  ['partner-settings', 'partner-dashboard/settings', 'partner'],
  ['partner-notifications', 'partner-dashboard/notifications', 'partner'],
  // admin workspace (demo role: admin — no public login UI, ?as=admin path)
  ['admin-overview', 'admin', 'admin'],
  ['admin-cockpit', 'admin/cockpit', 'admin'],
  ['admin-events', 'admin/events', 'admin'],
];

// ── Tiny static server with SPA fallback ────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain',
};
function serveDist() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(DIST, path);
    if (!existsSync(file) || extname(file) === '') file = join(DIST, 'index.html');
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// ── Main ────────────────────────────────────────────────────────────────────
if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`✗ ${DIST}/index.html missing — build the UI first.`);
  process.exit(1);
}
await mkdir(OUT, { recursive: true });
const server = await serveDist();
const base = `http://127.0.0.1:${server.address().port}`;
// Sandbox fallback: the pinned Playwright build may lag behind the
// pre-installed browser; /opt/pw-browsers/chromium is the stable entry point.
const browser = await chromium
  .launch()
  .catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
const context = await browser.newContext({
  viewport: MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: MOBILE ? 2 : 1,
  locale: LOCALE,
  colorScheme: DARK ? 'dark' : 'light',
});
// Pin the theme so shots don't depend on prefers-color-scheme timing.
await context.addInitScript((theme) => localStorage.setItem('ch360-theme', theme), DARK ? 'dark' : 'light');

let n = 0, failed = 0;
for (const [stem, path, role] of ROUTES) {
  n += 1;
  const page = await context.newPage();
  // Seed (or clear) the demo session before any app code runs.
  await page.addInitScript((r) => {
    if (r) {
      localStorage.setItem('demo_is_logged_in', 'true');
      localStorage.setItem('demo_user_role', r);
      localStorage.setItem('demo_user_name', `demo-${r}`);
    } else {
      localStorage.removeItem('demo_is_logged_in');
      localStorage.removeItem('demo_user_role');
      localStorage.removeItem('demo_user_name');
    }
  }, role);
  const url = `${base}/${LOCALE}/${path}`;
  const file = join(OUT, `${String(n).padStart(2, '0')}-${role ?? 'public'}-${stem}${MOBILE ? '-mobile' : ''}${DARK ? '-dark' : ''}.png`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    // Best effort: settle network + fonts + entrance animations, then shoot.
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1_200);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`✓ ${file.replace(`${OUT}/`, '')}  ←  /${LOCALE}/${path}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ /${LOCALE}/${path}: ${err.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
}

await browser.close();
server.close();
console.log(`\n${n - failed}/${n} screenshots → ${OUT}`);
process.exit(failed ? 1 : 0);
