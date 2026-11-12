import jwt from 'jsonwebtoken';
import {config} from '#shared/config.ts';
import {HttpError} from './HttpError.ts';

export const ROLES = ['admin', 'doctor', 'patient'] as const;
export type Role = (typeof ROLES)[number];

export interface AuthUser {
    id: string;
    role: Role;
    name: string;
    email?: string; // absent in tokens issued before it was added
}

/** Every service verifies access tokens itself with the shared secret; only identity issues them. */
export function verifyAccessToken(token: string): AuthUser {
    try {
        const p = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
        return {id: p.sub!, role: p.role, name: p.name, email: p.email};
    } catch {
        throw new HttpError(401, 'Session expired');
    }
}
