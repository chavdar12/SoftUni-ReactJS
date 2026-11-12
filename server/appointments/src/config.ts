export const config = {
    identityUrl: process.env.IDENTITY_URL ?? 'http://localhost:4000',
    clinicTz: process.env.CLINIC_TZ ?? 'Europe/Sofia', // working hours are clinic wall-clock time
} as const;
