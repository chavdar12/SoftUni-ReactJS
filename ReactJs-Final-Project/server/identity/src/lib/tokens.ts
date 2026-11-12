import {createHash, randomBytes} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {config as shared} from '#shared/config.ts';
import {config} from '#identity/config.ts';
import {redis} from '#shared/lib/redis.ts';
import {HttpError} from '#shared/lib/HttpError.ts';
import type {AuthUser} from '#shared/lib/jwt.ts';

// Refresh and reset tokens are opaque; Redis holds only their hash, so a Redis dump can't be replayed.
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const refreshKey = (h: string) => `refresh:${h}`;
const resetKey = (token: string) => `reset:${hash(token)}`;
// The set of a user's refresh-token hashes, so "log out everywhere" can find them.
const sessionsKey = (userId: string) => `sessions:${userId}`;

export const signAccessToken = (u: AuthUser) =>
    jwt.sign({role: u.role, name: u.name, email: u.email}, shared.jwtSecret, {subject: u.id, expiresIn: config.accessTtl});

export async function issueRefreshToken(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const h = hash(token);
    await redis
        .multi()
        .set(refreshKey(h), userId, 'EX', config.refreshTtlSeconds)
        .sadd(sessionsKey(userId), h)
        .expire(sessionsKey(userId), config.refreshTtlSeconds)
        .exec();
    return token;
}

/** Single use: the token is deleted as it is read (rotation). Returns the user id. */
export async function consumeRefreshToken(token: unknown) {
    const userId = await revokeRefreshToken(token);
    if (!userId) throw new HttpError(401, 'Session expired');
    return userId;
}

/** Deletes one refresh token; returns its user id, or null if it was unknown. */
export async function revokeRefreshToken(token: unknown) {
    if (typeof token !== 'string') return null;
    const h = hash(token);
    const userId = await redis.getdel(refreshKey(h));
    if (userId) await redis.srem(sessionsKey(userId), h);
    return userId;
}

/** Signs the user out on every device. */
export async function revokeAllRefreshTokens(userId: string) {
    const hashes = await redis.smembers(sessionsKey(userId));
    await redis.del(...hashes.map(refreshKey), sessionsKey(userId));
}

export async function issueResetToken(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await redis.set(resetKey(token), userId, 'EX', config.resetTtlSeconds);
    return token;
}

/** A short-lived ticket between "password OK" and "second step OK" at sign-in. */
const mfaKey = (token: string) => `mfa:${hash(token)}`;

export async function issueMfaToken(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await redis.set(mfaKey(token), userId, 'EX', config.mfaTtlSeconds);
    return token;
}

/** The user id behind a pending sign-in; `consume` ends it (on success). */
export async function readMfaToken(token: string, consume = false) {
    const userId = await (consume ? redis.getdel(mfaKey(token)) : redis.get(mfaKey(token)));
    if (!userId) throw new HttpError(401, 'Sign-in timed out. Please start again.');
    return userId;
}

/** Stores a WebAuthn challenge we issued; consumeChallenge succeeds once per challenge. */
export const saveChallenge = (challenge: string) => redis.set(`webauthn:${challenge}`, '1', 'EX', 300);
export const consumeChallenge = async (challenge: string) => !!(await redis.getdel(`webauthn:${challenge}`));

/** Single use. Returns the user id. */
export async function consumeResetToken(token: string) {
    const userId = await redis.getdel(resetKey(token));
    if (!userId) throw new HttpError(400, 'This reset link is invalid or has expired');
    return userId;
}
