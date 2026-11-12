export const config = {
    accessTtl: '15m',
    refreshTtlSeconds: 7 * 24 * 3600,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
} as const;
