/// <reference types="vitest/config" />
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { seoPlugin } from './vite-plugin-seo';
import { mockApiPlugin } from './vite-plugin-mock-api';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  // mockApiPlugin ist nur mit VITE_MOCK_API=1 aktiv (nur `vite dev`).
  plugins: [react(), seoPlugin(), mockApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // Resolve the engine from SOURCE, never from its build output.
      //
      // The package points at `dist/index.js`, dist/ is gitignored, and nothing
      // in this app builds it — the root `tsc -b` project list does not even
      // reference the engine. So it is only as current as whoever last ran a
      // build. In a worktree it is worse: with no node_modules of its own it
      // resolves up into the MAIN checkout and reads THAT dist, a state this
      // checkout can neither see nor fix. On 2026-09-17 that burned two
      // sessions — obligationScope.test.ts went red on a dist where
      // mktg-consent.default.scope was still 'eu', and the red was reported as
      // a product defect. Test and data were correct the whole time.
      //
      // Deliberately not test-only: dev, `vitest` and `vite build` take the
      // same path, so what the tests prove is what ships. dist/ remains for
      // services/compliance-api, which imports the package at runtime.
      "@complihub/compliance-engine": path.resolve(
        dirname,
        "../../../packages/compliance-engine/index.ts",
      ),
    },
  },
  cacheDir: './.vite',
  optimizeDeps: {
    // Pre-bundle everything the Storybook browser tests touch: deps that Vite
    // only discovers mid-run trigger a re-optimize + reload, which the running
    // chromium tests see as "Failed to fetch dynamically imported module"
    // (flaky CI failures on cold caches).
    include: ['jspdf', 'react-dom/client', 'zustand', 'react-router-dom', 'react-i18next', 'i18next', 'lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        // compliance-api (services/compliance-api) binds PORT 3005 by default.
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3005',
        changeOrigin: true,
        secure: false
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    pool: 'forks',
    projects: [{
      // Plain unit tests. Without an explicit entry here the storybook project
      // below is the only project vitest knows about, and every *.test.tsx
      // under src/ is skipped in silence — "No test files found" rather than a
      // failure, which is the kind of green that means nothing.
      extends: true,
      test: {
        name: 'unit',
        environment: 'happy-dom',
        include: ['src/**/*.test.{ts,tsx}'],
        setupFiles: ['./src/test/setup.ts'],
      },
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
    allowedHosts: true
  }
});