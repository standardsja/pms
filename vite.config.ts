import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: '0.0.0.0', // Listen on all interfaces for server deployment
        port: 5173,
        // Allow requests addressed to specific hostnames when developing on a remote/devbox.
        // Read from `VITE_ALLOWED_HOSTS` env var (comma-separated) or fall back to a safe default.
        // CAUTION: This is for development only — do not expose arbitrary hosts in production.
        allowedHosts: process.env.VITE_ALLOWED_HOSTS ? process.env.VITE_ALLOWED_HOSTS.split(',').map((s) => s.trim()) : ['heron', 'sphinx-dev', 'sphinx-prod', 'localhost', '127.0.0.1'],
        proxy: {
            // Proxy API requests to the backend
            '/api': {
                target: process.env.VITE_API_URL || 'http://localhost:4000',
                changeOrigin: true,
            },
            // Note: Only proxy /api paths. DO NOT proxy frontend routes like /procurement, /finance, etc.
            // Those are React Router routes and should be handled by the frontend.
        },
    },
});
