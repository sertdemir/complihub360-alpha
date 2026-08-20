/// <reference types="vitest/config" />
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { seoPlugin } from './vite-plugin-seo';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react(), seoPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
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