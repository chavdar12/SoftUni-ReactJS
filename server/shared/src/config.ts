/** Settings every service needs. Service-specific ones live in <service>/src/config.ts. */
function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing env var ${name}`);
    return value;
}

export const config = {
    port: Number(process.env.PORT ?? 4000),
    mongoUrl: process.env.MONGO_URL ?? 'mongodb://localhost:27017',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    jwtSecret: required('JWT_SECRET'),
};
