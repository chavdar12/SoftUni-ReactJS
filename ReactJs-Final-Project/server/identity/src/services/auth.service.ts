import bcrypt from 'bcryptjs';
import {hashPassword} from './helpers.ts';
import {config} from '#identity/config.ts';
import {HttpError} from '#shared/lib/HttpError.ts';
import {sendMail} from '#shared/lib/mailer.ts';
import {type UserDoc, userRepository} from '#identity/repositories/user.repository.ts';
import {consumeRefreshToken, consumeResetToken, issueMfaToken, issueResetToken, readMfaToken, revokeAllRefreshTokens, revokeRefreshToken} from '#identity/lib/tokens.ts';
import {assertNotLocked, clearFailures, recordFailure} from '#identity/lib/lockout.ts';
import {checkCode, issueCode} from '#identity/lib/codes.ts';
import {checkTotp} from './security.service.ts';
import {type IssuedSession, startSession} from './session.service.ts';
import type {
    ForgotPasswordDto,
    LoginDto,
    MfaChallengeDto,
    MfaMethod,
    MfaTokenDto,
    ResetPasswordDto,
    SignupDto,
    VerifyMfaDto,
} from '#identity/dto/auth.dto.ts';

export async function signup({password, ...profile}: SignupDto) {
    const user = await userRepository.create({...profile, passwordHash: await hashPassword(password), role: 'patient'});
    return startSession(user);
}

/** Second-step options for this account; none means the password alone signs in. */
export function mfaMethods(user: UserDoc): MfaMethod[] {
    const methods: MfaMethod[] = [];
    if (user.totp?.secret) methods.push('totp');
    // Email codes: the user's choice, or the backup for an authenticator, if the address is verified.
    if (user.emailVerified && (user.emailCodeLogin || user.totp?.secret)) methods.push('email');
    return methods;
}

export async function login({email, password}: LoginDto): Promise<IssuedSession | MfaChallengeDto> {
    await assertNotLocked(email);
    const user = await userRepository.findActiveByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        await recordFailure(email);
        throw new HttpError(401, 'Invalid email or password');
    }
    await clearFailures(email);
    const methods = mfaMethods(user);
    if (methods.length) return {mfaRequired: true, mfaToken: await issueMfaToken(user.id), methods};
    return startSession(user);
}

/** Emails a sign-in code for a pending two-step sign-in. */
export async function sendLoginCode({mfaToken}: MfaTokenDto) {
    const user = await userRepository.findById(await readMfaToken(mfaToken));
    if (!user || !mfaMethods(user).includes('email')) throw new HttpError(400, 'Email codes are not enabled for this account');
    const code = await issueCode('login', user.id, user.email);
    await sendMail({to: user.email, subject: `${code} is your HMS sign-in code`, text: `Your sign-in code is ${code}. It expires in 10 minutes.`});
}

/** Finishes a two-step sign-in. Wrong codes count toward the account lockout. */
export async function verifyMfa({mfaToken, method, code}: VerifyMfaDto) {
    const user = await userRepository.findActiveById(await readMfaToken(mfaToken));
    if (!user || !mfaMethods(user).includes(method)) throw new HttpError(400, 'That method is not enabled for this account');
    await assertNotLocked(user.email);
    try {
        if (method === 'totp') await checkTotp(user, code);
        else await checkCode('login', user.id, code);
    } catch (err) {
        await recordFailure(user.email);
        throw err;
    }
    await Promise.all([readMfaToken(mfaToken, true), clearFailures(user.email)]);
    return startSession(user);
}

export async function refresh(refreshToken: unknown) {
    const user = await userRepository.findActiveById(await consumeRefreshToken(refreshToken));
    if (!user) throw new HttpError(401, 'Session expired');
    return startSession(user);
}

export const logout = (refreshToken: unknown) => revokeRefreshToken(refreshToken);

/** Silent when the email is unknown, so the endpoint can't reveal which emails are registered. */
export async function forgotPassword({email}: ForgotPasswordDto) {
    const user = await userRepository.findActiveByEmail(email);
    if (!user) return;
    const link = `${config.appUrl}/reset-password?token=${await issueResetToken(user.id)}`;
    await sendMail({
        to: user.email,
        subject: 'Reset your HMS password',
        text: `Open this link within an hour to choose a new password:\n${link}\n\nIf you didn't ask for this, ignore this email.`,
    });
}

export async function resetPassword({token, password}: ResetPasswordDto) {
    const user = await userRepository.findById(await consumeResetToken(token));
    if (!user) throw new HttpError(400, 'This reset link is invalid or has expired');
    user.passwordHash = await hashPassword(password);
    await userRepository.save(user);
    await Promise.all([revokeAllRefreshTokens(user.id), clearFailures(user.email)]);
}
