import type {NextFunction, Request, Response} from 'express';
import {redis} from '#shared/lib/redis.ts';
import {HttpError} from '#shared/lib/HttpError.ts';
import {logger} from '#shared/lib/logger.ts';

const TTL_SECONDS = 24 * 3600;

/**
 * Replays the first response for a repeated `Idempotency-Key` (per user + route), so a retried
 * POST never books twice. Requests without the header pass through untouched.
 */
export async function idempotent(req: Request, res: Response, next: NextFunction) {
    const key = req.get('Idempotency-Key');
    if (!key) return next();
    if (key.length > 100) throw new HttpError(400, 'Idempotency-Key too long');

    const redisKey = `idem:${req.user.id}:${req.method}:${req.originalUrl}:${key}`;
    const claimed = await redis.set(redisKey, 'pending', 'EX', TTL_SECONDS, 'NX');
    if (!claimed) {
        const saved = await redis.get(redisKey);
        if (!saved || saved === 'pending') throw new HttpError(409, 'A request with this Idempotency-Key is in progress');
        const {status, body} = JSON.parse(saved);
        res.set('Idempotent-Replayed', 'true');
        return res.status(status).json(body);
    }

    const json = res.json.bind(res);
    res.json = (body) => {
        // 5xx may be transient: free the key so the client can retry.
        const save = res.statusCode >= 500
            ? redis.del(redisKey)
            : redis.set(redisKey, JSON.stringify({status: res.statusCode, body}), 'EX', TTL_SECONDS);
        save.catch((err) => logger.error('idempotency save failed', {reqId: res.locals.reqId, err}));
        return json(body);
    };
    next();
}
