import bcrypt from 'bcryptjs';
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {config} from '#identity/config.ts';
import {HttpError} from '#shared/lib/HttpError.ts';
import {redis} from '#shared/lib/redis.ts';
import {sendMail, sendSms} from '#shared/lib/mailer.ts';
import {type UserDoc, userRepository} from '#identity/repositories/user.repository.ts';
import {checkCode, issueCode} from '#identity/lib/codes.ts';
import {generateSecret, otpauthUrl, verifyTotp} from '#identity/lib/totp.ts';
import {open, seal} from '#identity/lib/secretBox.ts';
import {consumeChallenge, saveChallenge} from '#identity/lib/tokens.ts';
import {assertNotLocked, clearFailures, recordFailure} from '#identity/lib/lockout.ts';
import {toSecurityDto} from '#identity/dto/security.dto.ts';
import type {AddPasskeyDto, PasskeyLoginDto, PasskeyOptionsDto} from '#identity/dto/security.dto.ts';
import {findAccount} from './helpers.ts';
import {startSession} from './session.service.ts';

const MAX_PASSKEYS = 10;
const origin = new URL(config.appUrl).origin;

/** Throws unless `code` is the account's current authenticator code. Each code works once (no replay). */
export async function checkTotp(user: UserDoc, code: string) {
    const step = user.totp?.secret ? verifyTotp(open(user.totp.secret), code) : null;
    if (step === null || !(await redis.set(`totp-used:${user.id}:${step}`, '1', 'EX', 120, 'NX'))) {
        throw new HttpError(400, 'Wrong code');
    }
}

export const summary = async (userId: string) => toSecurityDto(await findAccount(userId));

// --- email and phone verification ---

export async function sendEmailCode(userId: string) {
    const u = await findAccount(userId);
    if (u.emailVerified) throw new HttpError(409, 'Email is already verified');
    const code = await issueCode('verify-email', u.id, u.email);
    await sendMail({to: u.email, subject: `${code} is your HMS verification code`, text: `Your email verification code is ${code}. It expires in 10 minutes.`});
}

export async function verifyEmail(userId: string, code: string) {
    const u = await findAccount(userId);
    if ((await checkCode('verify-email', u.id, code)) !== u.email) throw new HttpError(400, 'The code was for a different address');
    u.emailVerified = true;
    await userRepository.save(u);
}

export async function sendPhoneCode(userId: string) {
    const u = await findAccount(userId);
    if (!u.phone || !/^\+\d+$/.test(u.phone)) throw new HttpError(400, 'Save a phone number in international format first');
    if (u.phoneVerified) throw new HttpError(409, 'Phone is already verified');
    const code = await issueCode('verify-phone', u.id, u.phone);
    await sendSms(u.phone, `HMS: your verification code is ${code}`);
}

export async function verifyPhone(userId: string, code: string) {
    const u = await findAccount(userId);
    if ((await checkCode('verify-phone', u.id, code)) !== u.phone) throw new HttpError(400, 'The code was for a different number');
    u.phoneVerified = true;
    await userRepository.save(u);
}

// --- two-step sign-in ---

export async function setEmailCodeLogin(userId: string, enabled: boolean) {
    const u = await findAccount(userId);
    if (enabled && !u.emailVerified) throw new HttpError(400, 'Verify your email first');
    u.emailCodeLogin = enabled;
    await userRepository.save(u);
}

/** Starts authenticator setup: a fresh secret, kept in Redis until the user proves their app has it. */
export async function startTotp(userId: string) {
    const u = await findAccount(userId);
    if (u.totp?.secret) throw new HttpError(409, 'An authenticator is already set up. Remove it to add a different one.');
    const secret = generateSecret();
    await redis.set(`totp-setup:${u.id}`, seal(secret), 'EX', 600);
    return {secret, otpauthUrl: otpauthUrl(secret, u.email)};
}

export async function confirmTotp(userId: string, code: string) {
    const sealed = await redis.get(`totp-setup:${userId}`);
    if (!sealed) throw new HttpError(400, 'Setup expired. Start again.');
    if (verifyTotp(open(sealed), code) === null) throw new HttpError(400, 'Wrong code. Check the time on your phone and try again.');
    if (!(await userRepository.setTotpIfNone(userId, sealed))) throw new HttpError(409, 'An authenticator is already set up');
    await redis.del(`totp-setup:${userId}`);
}

/** Needs a current code, so a stolen session alone can't switch two-step off. */
export async function removeTotp(userId: string, code: string) {
    const u = await findAccount(userId);
    await checkTotp(u, code);
    u.totp = undefined;
    await userRepository.save(u);
}

// --- passkeys ---

/**
 * Re-checks the password first, so a hijacked session alone can't add a sign-in method. addPasskey only
 * accepts a challenge issued here, so the check covers the whole flow. Wrong passwords count toward the lockout.
 */
export async function passkeyRegistrationOptions(userId: string, {password}: PasskeyOptionsDto) {
    const u = await findAccount(userId);
    await assertNotLocked(u.email);
    if (!(await bcrypt.compare(password, u.passwordHash))) {
        await recordFailure(u.email);
        throw new HttpError(400, 'Wrong password');
    }
    await clearFailures(u.email);
    if (u.passkeys.length >= MAX_PASSKEYS) throw new HttpError(409, `At most ${MAX_PASSKEYS} passkeys per account`);
    const options = await generateRegistrationOptions({
        rpName: config.rpName,
        rpID: config.rpId,
        userName: u.email,
        userDisplayName: u.name,
        userID: new TextEncoder().encode(u.id),
        attestationType: 'none',
        excludeCredentials: u.passkeys.map((p) => ({id: p.credentialId, transports: p.transports})),
        authenticatorSelection: {residentKey: 'required', userVerification: 'preferred'},
    });
    await redis.set(`webauthn-reg:${u.id}`, options.challenge, 'EX', 300);
    return options;
}

export async function addPasskey(userId: string, {name, response}: AddPasskeyDto) {
    const u = await findAccount(userId);
    const challenge = await redis.getdel(`webauthn-reg:${u.id}`);
    if (!challenge) throw new HttpError(400, 'Passkey setup expired. Try again.');
    const result = await verifyRegistrationResponse({
        response: response as any,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: config.rpId,
        requireUserVerification: false,
    }).catch((err: Error) => {
        throw new HttpError(400, `Passkey not accepted: ${err.message}`);
    });
    if (!result.verified) throw new HttpError(400, 'Passkey not accepted');
    const {credential} = result.registrationInfo;
    u.passkeys.push({
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports ?? [],
        name,
    });
    await userRepository.save(u);
}

export async function renamePasskey(userId: string, credentialId: string, name: string) {
    if (!(await userRepository.renamePasskey(userId, credentialId, name))) throw new HttpError(404, 'Passkey not found');
}

export async function deletePasskey(userId: string, credentialId: string) {
    if (!(await userRepository.removePasskey(userId, credentialId))) throw new HttpError(404, 'Passkey not found');
}

/** Passwordless sign-in, step 1: a challenge any of the user's passkeys can answer (they pick the account). */
export async function passkeyLoginOptions() {
    const options = await generateAuthenticationOptions({rpID: config.rpId, userVerification: 'preferred'});
    await saveChallenge(options.challenge);
    return options;
}

/** Step 2. A passkey is phishing-resistant on its own, so it skips the second step. */
export async function passkeyLogin({response}: PasskeyLoginDto) {
    const user = await userRepository.findActiveByPasskey(response.id);
    const passkey = user?.passkeys.find((p) => p.credentialId === response.id);
    if (!user || !passkey) throw new HttpError(401, 'This passkey is not registered');
    const result = await verifyAuthenticationResponse({
        response: response as any,
        expectedChallenge: consumeChallenge,
        expectedOrigin: origin,
        expectedRPID: config.rpId,
        credential: {
            id: passkey.credentialId,
            publicKey: Buffer.from(passkey.publicKey, 'base64url'),
            counter: passkey.counter ?? 0,
            transports: passkey.transports as any,
        },
        requireUserVerification: false,
    }).catch(() => ({verified: false}) as const);
    if (!result.verified) throw new HttpError(401, 'Passkey sign-in failed');
    await userRepository.recordPasskeyUse(user.id, passkey.credentialId, result.authenticationInfo.newCounter);
    return startSession(user);
}
