import type {NextFunction, Request, Response} from 'express';
import {HttpError} from '#shared/lib/HttpError.ts';
import {type AuthUser, type Role, verifyAccessToken} from '#shared/lib/jwt.ts';

declare global {
    namespace Express {
        interface Request {
            user: AuthUser;
        }
    }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
    const token = req.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new HttpError(401, 'Not signed in');
    req.user = verifyAccessToken(token);
    next();
}

export const requireRole =
    (...roles: Role[]) =>
    (req: Request, _res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) throw new HttpError(403, 'Forbidden');
        next();
    };
