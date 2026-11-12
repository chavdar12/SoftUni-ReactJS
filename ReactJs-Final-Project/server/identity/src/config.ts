export const config = {
    accessTtl: '15m',
    refreshTtlSeconds: 7 * 24 * 3600,
    resetTtlSeconds: 3600,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    appUrl: process.env.APP_URL ?? 'http://localhost:8080', // links in emails point here; also the passkey origin
    // Passkeys are bound to this domain (no port). Must match the host users browse to.
    rpId: process.env.RP_ID ?? 'localhost',
    rpName: 'HMS',
    mfaTtlSeconds: 5 * 60,
} as const;
