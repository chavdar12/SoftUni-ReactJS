import {randomUUID} from 'node:crypto';
import type {NextFunction, Request, Response} from 'express';
import {trace} from '@opentelemetry/api';
import {logger} from '../lib/logger.ts';

/** One log line per request. Reuses nginx's X-Request-ID so a request can be traced across services. */
export function requestLog(req: Request, res: Response, next: NextFunction) {
    const start = performance.now();
    const reqId = req.get('X-Request-ID') || randomUUID();
    const traceId = trace.getActiveSpan()?.spanContext().traceId; // captured now: 'finish' fires outside the span
    res.locals.reqId = reqId;
    res.set('X-Request-ID', reqId);
    res.on('finish', () => {
        logger[res.statusCode >= 500 ? 'error' : 'info']('request', {
            reqId,
            traceId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            ms: Math.round(performance.now() - start),
            userId: req.user?.id,
        });
    });
    next();
}
