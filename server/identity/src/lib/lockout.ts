import {redis} from '#shared/lib/redis.ts';
import {HttpError} from '#shared/lib/HttpError.ts';

// Per-account, unlike the gateway's per-IP limit, so spreading guesses over many IPs doesn't help.
export const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60;
const key = (email: string) => `login-fail:${email.toLowerCase()}`;

export async function assertNotLocked(email: string) {
    if (Number(await redis.get(key(email))) >= MAX_FAILURES) {
        throw new HttpError(429, 'Too many failed sign-in attempts. Try again in 15 minutes.');
    }
}

/** The window starts at the first failure (EXPIRE NX), so retries don't extend it. */
export async function recordFailure(email: string) {
    await redis.multi().incr(key(email)).expire(key(email), WINDOW_SECONDS, 'NX').exec();
}

export const clearFailures = (email: string) => redis.del(key(email));
