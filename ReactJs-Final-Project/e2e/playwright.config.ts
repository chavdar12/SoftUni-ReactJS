import {defineConfig} from '@playwright/test';

try {
    process.loadEnvFile('../.env');
} catch {
    // CI passes ADMIN_EMAIL / ADMIN_PASSWORD as real env vars.
}

// Runs against the gateway of the Kubernetes deployment (see README).
export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
        trace: 'retain-on-failure',
    },
});
