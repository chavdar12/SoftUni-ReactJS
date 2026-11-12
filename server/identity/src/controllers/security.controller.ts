import type {Request, Response} from 'express';
import * as security from '#identity/services/security.service.ts';
import {sendSession} from './auth.controller.ts';
import type {AddPasskeyDto, CodeDto, PasskeyLoginDto, PasskeyOptionsDto, RenamePasskeyDto, UpdateSecurityDto} from '#identity/dto/security.dto.ts';

const done = (res: Response, status = 204) => res.status(status).end();
const code = (req: Request) => (req.body as CodeDto).code;
const credentialId = (req: Request) => String(req.params.credentialId);

export async function summary(req: Request, res: Response) {
    res.json(await security.summary(req.user.id));
}

export async function sendEmailCode(req: Request, res: Response) {
    await security.sendEmailCode(req.user.id);
    done(res);
}

export async function verifyEmail(req: Request, res: Response) {
    await security.verifyEmail(req.user.id, code(req));
    done(res);
}

export async function sendPhoneCode(req: Request, res: Response) {
    await security.sendPhoneCode(req.user.id);
    done(res);
}

export async function verifyPhone(req: Request, res: Response) {
    await security.verifyPhone(req.user.id, code(req));
    done(res);
}

export async function updateSecurity(req: Request, res: Response) {
    await security.setEmailCodeLogin(req.user.id, (req.body as UpdateSecurityDto).emailCodeLogin);
    done(res);
}

export async function startTotp(req: Request, res: Response) {
    res.json(await security.startTotp(req.user.id));
}

export async function confirmTotp(req: Request, res: Response) {
    await security.confirmTotp(req.user.id, code(req));
    done(res);
}

export async function removeTotp(req: Request, res: Response) {
    await security.removeTotp(req.user.id, code(req));
    done(res);
}

export async function passkeyRegistrationOptions(req: Request, res: Response) {
    res.json(await security.passkeyRegistrationOptions(req.user.id, req.body as PasskeyOptionsDto));
}

export async function addPasskey(req: Request, res: Response) {
    await security.addPasskey(req.user.id, req.body as AddPasskeyDto);
    done(res, 201);
}

export async function renamePasskey(req: Request, res: Response) {
    await security.renamePasskey(req.user.id, credentialId(req), (req.body as RenamePasskeyDto).name);
    done(res);
}

export async function deletePasskey(req: Request, res: Response) {
    await security.deletePasskey(req.user.id, credentialId(req));
    done(res);
}

export async function passkeyLoginOptions(_req: Request, res: Response) {
    res.json(await security.passkeyLoginOptions());
}

export async function passkeyLogin(req: Request, res: Response) {
    sendSession(res, await security.passkeyLogin(req.body as PasskeyLoginDto));
}
