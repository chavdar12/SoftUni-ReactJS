import {createHash, randomBytes} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {config as shared} from '../../../shared/src/config.ts';
import {config} from '../config.ts';
import {redis} from '../../../shared/src/lib/redis.ts';
import {HttpError} from '../../../shared/src/lib/HttpError.ts';
import type {AuthUser} from '../../../shared/src/lib/jwt.ts';

// Refresh tokens are opaque; Redis holds only their hash, so a Redis dump can't be replayed.
const refreshKey = (token: string) => `refresh:${createHash('sha256').update(token).digest('hex')}`;

export const signAccessToken = (u: AuthUser) =>
    jwt.sign({role: u.role, name: u.name}, shared.jwtSecret, {subject: u.id, expiresIn: config.accessTtl});

export async function issueRefreshToken(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await redis.set(refreshKey(token), userId, 'EX', config.refreshTtlSeconds);
    return token;
}

/** Single use: the token is deleted as it is read (rotation). Returns the user id. */
export async function consumeRefreshToken(token: unknown) {
    const userId = typeof token === 'string' && (await redis.getdel(refreshKey(token)));
    if (!userId) throw new HttpError(401, 'Session expired');
    return userId;
}

export const revokeRefreshToken = async (token: unknown) => {
    if (typeof token === 'string') await redis.del(refreshKey(token));
};
