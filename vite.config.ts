import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            // Proxy API requests to the unified TypeScript backend
            '/api': {
                // Unified backend on port 4000 (server/index.ts)
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            // Also proxy admin/auth and non-prefixed endpoints used by the app
            '/admin': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/auth': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/requests': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
});
