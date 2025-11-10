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
                // Unified backend running on port 4000 (index.mjs)
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
});
