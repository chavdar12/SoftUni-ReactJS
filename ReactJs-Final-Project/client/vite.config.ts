import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

export default defineConfig({
    plugins: [react()],
    resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}}, // also in tsconfig paths
    // Dev only (npm run dev:identity / dev:appointments in server/); in Docker, nginx does this routing.
    server: {
        proxy: {
            '^/api/(appointments|prescriptions|ratings|stats|history|notes|events)': 'http://localhost:4001',
            '/api': 'http://localhost:4000',
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.test.{ts,tsx}'],
        clearMocks: true,
    },
});
