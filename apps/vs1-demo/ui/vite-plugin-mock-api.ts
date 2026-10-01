import type { Plugin } from 'vite';
import { route } from './src/mock/demoApi';

// ─── Mock-API für den lokalen Dev-Server ─────────────────────────────────────
// `VITE_MOCK_API=1 npm run dev` (Repo-Root: `npm run dev:ui:mock`): jede
// Anfrage an /api/v1/* wird aus dem Demo-Datensatz in `src/mock/demoApi.ts`
// beantwortet statt an die compliance-api weitergereicht. Derselbe Datensatz
// bedient auf Staging den Demo-Login (siehe api/client.ts, TEMP-DEMO-DATEN).

export function mockApiPlugin(): Plugin {
  const enabled = process.env.VITE_MOCK_API === '1';
  return {
    name: 'complihub-mock-api',
    apply: 'serve',
    configureServer(server) {
      if (!enabled) return;
      server.config.logger.info('  ➜  mock-api: /api/v1/* antwortet aus dem eingebauten Worst-Case-Datensatz (VITE_MOCK_API=1)');
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/v1/')) return next();
        const url = new URL(req.url, 'http://mock.local');
        let raw = '';
        req.on('data', (c: Buffer) => { raw += c.toString(); });
        req.on('end', () => {
        let parsed: Record<string, unknown> = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { /* kein JSON */ }
        const role = String(req.headers['x-demo-role'] ?? '');
        const body = route(req.method ?? 'GET', url.pathname, parsed, role, url.searchParams);
        res.setHeader('content-type', 'application/json');
        res.setHeader('x-mock-api', '1');
        // Eine Antwort darf ihren Status mitbringen (404 fuer unbekannte Anbieter).
        const { __status, ...payload } = (body ?? {}) as { __status?: number } & Record<string, unknown>;
        res.statusCode = __status ?? 200;
        // Kurze Latenz, damit Lade- und Leerzustaende nicht flackern.
        setTimeout(() => res.end(JSON.stringify(payload)), 120);
        });
      });
    },
  };
}
