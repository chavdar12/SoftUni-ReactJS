import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // Dev only (npm run dev:identity / dev:appointments in server/); in Docker, nginx does this routing.
    server: {
        proxy: {
            '^/api/(appointments|prescriptions)': 'http://localhost:4001',
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
