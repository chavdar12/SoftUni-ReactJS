import type {Request, Response} from 'express';
import type {Redis} from 'ioredis';
import {redis} from '#shared/lib/redis.ts';
import {logger} from '#shared/lib/logger.ts';
import type {AuthUser} from '#shared/lib/jwt.ts';
import {type Change, shouldNotify} from './policy.ts';

// Changes go through Redis pub/sub so every pod hears them, whichever pod made the change.
const CHANNEL = 'appointments:changed';
const HEARTBEAT_MS = 20_000; // under the gateway's 30s proxy_read_timeout

const streams = new Set<{user: AuthUser; res: Response}>();
let subscriber: Redis | undefined;

function subscribe() {
    subscriber = redis.duplicate();
    subscriber.on('error', (err) => logger.warn('events subscriber error', {err}));
    subscriber.on('message', (_channel, message) => {
        const change = JSON.parse(message) as Change;
        for (const s of streams) if (shouldNotify(s.user, change)) s.res.write(`data: ${message}\n\n`);
    });
    void subscriber.subscribe(CHANNEL).catch((err) => logger.warn('events subscribe failed', {err}));
    // Open streams would hold graceful shutdown for its full 20s.
    process.once('SIGTERM', () => streams.forEach((s) => s.res.end()));
}

/** Tell the patient's and doctor's open pages that `a` changed. Best effort: pages also refetch on focus. */
export function publishChange(a: {patientId: unknown; doctorId: unknown}) {
    const change: Change = {patientId: String(a.patientId), doctorId: String(a.doctorId)};
    redis.publish(CHANNEL, JSON.stringify(change)).catch((err) => logger.warn('publish change failed', {err}));
}

/** GET /events: a Server-Sent Events stream of changes that concern the signed-in user. */
export function stream(req: Request, res: Response) {
    if (!subscriber) subscribe();
    res.set({'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'});
    res.flushHeaders();
    res.write(': connected\n\n');

    const entry = {user: req.user, res};
    streams.add(entry);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    req.on('close', () => {
        clearInterval(heartbeat);
        streams.delete(entry);
    });
}
