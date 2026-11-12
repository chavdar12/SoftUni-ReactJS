import type {Request, Response} from 'express';
import {config} from '#identity/config.ts';
import * as auth from '#identity/services/auth.service.ts';
import * as account from '#identity/services/account.service.ts';
import type {IssuedSession} from '#identity/services/session.service.ts';
import type {ChangePasswordDto, ForgotPasswordDto, LoginDto, MfaTokenDto, ResetPasswordDto, SignupDto, UpdateProfileDto, VerifyMfaDto} from '#identity/dto/auth.dto.ts';

// HTTP only: bodies arrive validated (validate middleware + DTO schemas); the services hold the rules.

const COOKIE = 'refreshToken';
const cookieOptions = {httpOnly: true, secure: true, sameSite: 'strict', path: '/api/auth'} as const;

/** Refresh token into the httpOnly cookie, session into the body. */
export function sendSession(res: Response, {session, refreshToken}: IssuedSession, status = 200) {
    res.cookie(COOKIE, refreshToken, {...cookieOptions, maxAge: config.refreshTtlSeconds * 1000});
    res.status(status).json(session);
}

const clearSession = (res: Response) => res.clearCookie(COOKIE, cookieOptions).status(204).end();

export async function signup(req: Request, res: Response) {
    sendSession(res, await auth.signup(req.body as SignupDto), 201);
}

export async function login(req: Request, res: Response) {
    const result = await auth.login(req.body as LoginDto);
    if ('mfaRequired' in result) res.json(result);
    else sendSession(res, result);
}

export async function sendLoginCode(req: Request, res: Response) {
    await auth.sendLoginCode(req.body as MfaTokenDto);
    res.status(204).end();
}

export async function verifyMfa(req: Request, res: Response) {
    sendSession(res, await auth.verifyMfa(req.body as VerifyMfaDto));
}

export async function refresh(req: Request, res: Response) {
    sendSession(res, await auth.refresh(req.cookies[COOKIE]));
}

export async function logout(req: Request, res: Response) {
    await auth.logout(req.cookies[COOKIE]);
    clearSession(res);
}

export async function forgotPassword(req: Request, res: Response) {
    await auth.forgotPassword(req.body as ForgotPasswordDto);
    res.status(204).end();
}

export async function resetPassword(req: Request, res: Response) {
    await auth.resetPassword(req.body as ResetPasswordDto);
    res.status(204).end();
}

// --- signed-in user ---

export async function updateProfile(req: Request, res: Response) {
    res.json(await account.updateProfile(req.user, req.body as UpdateProfileDto));
}

export async function changePassword(req: Request, res: Response) {
    sendSession(res, await account.changePassword(req.user.id, req.body as ChangePasswordDto));
}

export async function logoutEverywhere(req: Request, res: Response) {
    await account.logoutEverywhere(req.user.id);
    clearSession(res);
}
