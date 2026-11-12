import type {NextFunction, Request, Response} from 'express';
import {ZodError} from 'zod';
import {HttpError} from '#shared/lib/HttpError.ts';
import {logger} from '#shared/lib/logger.ts';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ZodError) {
        return res.status(400).json({error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')});
    }
    if (err.code === 11000) {
        return res.status(409).json({error: err.keyPattern?.email ? 'Email already registered' : 'Already exists'});
    }

    // HttpError and express's own errors (e.g. malformed JSON) carry `status`; anything else is a bug.
    const status = typeof err.status === 'number' ? err.status : 500;
    if (status >= 500) logger.error('request failed', {reqId: res.locals.reqId, err});
    const exposeMessage = status < 500 || err instanceof HttpError;
    res.status(status).json({error: exposeMessage ? err.message : 'Internal server error'});
}
