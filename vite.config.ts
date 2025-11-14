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
        host: '0.0.0.0', // Listen on all interfaces for server deployment
        port: 5173,
        proxy: {
            // Proxy API requests to the unified TypeScript backend
            // Uses VITE_API_URL from .env if available, otherwise localhost
            '/api': {
                target: process.env.VITE_API_URL || 'http://localhost:4000',
                changeOrigin: true,
            },
            // Also proxy admin/auth and non-prefixed endpoints used by the app
            '/admin': {
                target: process.env.VITE_API_URL || 'http://localhost:4000',
                changeOrigin: true,
            },
            '/auth': {
                target: process.env.VITE_API_URL || 'http://localhost:4000',
                changeOrigin: true,
            },
            '/requests': {
                target: process.env.VITE_API_URL || 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
});
