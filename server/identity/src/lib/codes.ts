import {createHash, randomInt} from 'node:crypto';
import {redis} from '#shared/lib/redis.ts';
import {HttpError} from '#shared/lib/HttpError.ts';

/** One-time 6-digit codes sent by email or SMS. Redis keeps only a hash, the target, and failed attempts. */
export type Purpose = 'verify-email' | 'verify-phone' | 'login';

export const CODE_TTL_SECONDS = 10 * 60;
export const MAX_ATTEMPTS = 5;
export const RESEND_SECONDS = 60;

const key = (purpose: Purpose, userId: string) => `code:${purpose}:${userId}`;
const cooldownKey = (purpose: Purpose, userId: string) => `code-cooldown:${purpose}:${userId}`;
const hash = (code: string) => createHash('sha256').update(code).digest('hex');

/** A new code for `target` (an email or phone), replacing any earlier one. Rate limited to one a minute. */
export async function issueCode(purpose: Purpose, userId: string, target: string) {
    if (!(await redis.set(cooldownKey(purpose, userId), '1', 'EX', RESEND_SECONDS, 'NX'))) {
        throw new HttpError(429, 'A code was just sent. Please wait a minute before asking for another.');
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await redis.set(key(purpose, userId), JSON.stringify({hash: hash(code), target, attempts: 0}), 'EX', CODE_TTL_SECONDS);
    return code;
}

/** Checks and consumes the code; returns the target it was sent to. */
export async function checkCode(purpose: Purpose, userId: string, code: string) {
    const raw = await redis.get(key(purpose, userId));
    if (!raw) throw new HttpError(400, 'The code has expired. Request a new one.');
    const entry = JSON.parse(raw) as {hash: string; target: string; attempts: number};
    if (entry.hash !== hash(code)) {
        if (++entry.attempts >= MAX_ATTEMPTS) {
            await redis.del(key(purpose, userId));
            throw new HttpError(400, 'Too many wrong codes. Request a new one.');
        }
        await redis.set(key(purpose, userId), JSON.stringify(entry), 'KEEPTTL');
        throw new HttpError(400, 'Wrong code');
    }
    await redis.del(key(purpose, userId));
    return entry.target;
}
