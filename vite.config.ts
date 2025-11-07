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
            // Proxy API requests to the local Express server
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
                // Don't rewrite the path - keep /api prefix
            },
            // Proxy auth requests to the local Express server
            '/auth': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
});
