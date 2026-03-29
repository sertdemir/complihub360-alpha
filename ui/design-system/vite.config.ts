/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    cacheDir: './.vite',
    server: {
        host: true, // Listen on all network interfaces
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3005',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: './src/test/setup.ts',
        pool: 'forks',
    },
});
