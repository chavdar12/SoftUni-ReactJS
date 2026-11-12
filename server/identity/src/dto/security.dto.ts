import {z} from 'zod';
import {code} from './auth.dto.ts';
import type {UserDoc} from '#identity/repositories/user.repository.ts';

// --- input ---

export const codeDto = z.object({code});
export type CodeDto = z.infer<typeof codeDto>;

export const updateSecurityDto = z.object({emailCodeLogin: z.boolean()});
export type UpdateSecurityDto = z.infer<typeof updateSecurityDto>;

// WebAuthn responses are verified by @simplewebauthn; zod checks only their outer shape.
const credentialResponse = z.looseObject({
    id: z.string().max(1024),
    rawId: z.string(),
    type: z.literal('public-key'),
    response: z.looseObject({}),
});
const passkeyName = z.string().trim().min(1).max(60);

export const passkeyLoginDto = z.object({response: credentialResponse});
export type PasskeyLoginDto = z.infer<typeof passkeyLoginDto>;

export const passkeyOptionsDto = z.object({password: z.string().min(1).max(200)});
export type PasskeyOptionsDto = z.infer<typeof passkeyOptionsDto>;

export const addPasskeyDto = z.object({name: passkeyName, response: credentialResponse});
export type AddPasskeyDto = z.infer<typeof addPasskeyDto>;

export const renamePasskeyDto = z.object({name: passkeyName});
export type RenamePasskeyDto = z.infer<typeof renamePasskeyDto>;

export const passkeyParams = z.object({credentialId: z.string().min(1).max(1024)});

// --- output ---

export interface PasskeyDto {
    id: string;
    name: string;
    createdAt: Date;
    lastUsedAt?: Date;
}

/** The owner's security overview. Never contains secrets or public keys. */
export interface SecurityDto {
    email: string;
    emailVerified: boolean;
    phone: string | null;
    phoneVerified: boolean;
    totpEnabled: boolean;
    emailCodeLogin: boolean;
    passkeys: PasskeyDto[];
}

export const toSecurityDto = (u: UserDoc): SecurityDto => ({
    email: u.email,
    emailVerified: !!u.emailVerified,
    phone: u.phone ?? null,
    phoneVerified: !!u.phoneVerified,
    totpEnabled: !!u.totp?.secret,
    emailCodeLogin: !!u.emailCodeLogin,
    passkeys: u.passkeys.map((p) => ({
        id: p.credentialId,
        name: p.name,
        createdAt: p.createdAt!,
        lastUsedAt: p.lastUsedAt ?? undefined,
    })),
});
