import type {Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import type {z} from 'zod';
import {config} from '../config.ts';
import {User} from '../models/User.ts';
import {HttpError} from '../../../shared/src/lib/HttpError.ts';
import type {loginBody, signupBody} from '../schemas.ts';
import {consumeRefreshToken, issueRefreshToken, revokeRefreshToken, signAccessToken} from '../lib/tokens.ts';

const COOKIE = 'refreshToken';
const cookieOptions = {httpOnly: true, secure: true, sameSite: 'strict', path: '/api/auth'} as const;


type UserDoc = InstanceType<typeof User>;

async function sendSession(res: Response, user: UserDoc, status = 200) {
    res.cookie(COOKIE, await issueRefreshToken(user.id), {...cookieOptions, maxAge: config.refreshTtlSeconds * 1000});
    res.status(status).json({accessToken: signAccessToken({id: user.id, role: user.role, name: user.name}), user});
}

export async function signup(req: Request, res: Response) {
    const {password, ...profile} = req.body as z.infer<typeof signupBody>;
    const user = await User.create({...profile, passwordHash: await bcrypt.hash(password, 10), role: 'patient'});
    await sendSession(res, user, 201);
}

export async function login(req: Request, res: Response) {
    const {email, password} = req.body as z.infer<typeof loginBody>;
    const user = await User.findOne({email: email.toLowerCase()});
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password');
    await sendSession(res, user);
}

export async function refresh(req: Request, res: Response) {
    const user = await User.findById(await consumeRefreshToken(req.cookies[COOKIE]));
    if (!user) throw new HttpError(401, 'Session expired');
    await sendSession(res, user);
}

export async function logout(req: Request, res: Response) {
    await revokeRefreshToken(req.cookies[COOKIE]);
    res.clearCookie(COOKIE, cookieOptions).status(204).end();
}
