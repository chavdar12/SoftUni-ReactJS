import {z} from 'zod';
import {name, password, phone, type UserDto} from './user.dto.ts';
import {workingHoursSchema} from '#shared/lib/hours.ts';

// --- input ---

export const signupDto = z.object({name, email: z.email().max(200), phone, password});
export type SignupDto = z.infer<typeof signupDto>;

export const loginDto = z.object({email: z.email(), password: z.string().min(1).max(200)});
export type LoginDto = z.infer<typeof loginDto>;

export const forgotPasswordDto = z.object({email: z.email()});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordDto>;

export const resetPasswordDto = z.object({token: z.string().min(1).max(200), password});
export type ResetPasswordDto = z.infer<typeof resetPasswordDto>;

export const code = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');
const mfaToken = z.string().min(1).max(200);

export const mfaMethod = z.enum(['totp', 'email']);
export type MfaMethod = z.infer<typeof mfaMethod>;

export const verifyMfaDto = z.object({mfaToken, method: mfaMethod, code});
export type VerifyMfaDto = z.infer<typeof verifyMfaDto>;

export const mfaTokenDto = z.object({mfaToken});
export type MfaTokenDto = z.infer<typeof mfaTokenDto>;

/** workingHours is ignored for non-doctors. */
export const updateProfileDto = z.object({name, phone, workingHours: workingHoursSchema}).partial();
export type UpdateProfileDto = z.infer<typeof updateProfileDto>;

export const changePasswordDto = z.object({currentPassword: z.string().min(1).max(200), newPassword: password});
export type ChangePasswordDto = z.infer<typeof changePasswordDto>;

// --- output ---

export interface SessionDto {
    accessToken: string;
    user: UserDto;
}

/** Password was right, but the account needs a second step before a session is issued. */
export interface MfaChallengeDto {
    mfaRequired: true;
    mfaToken: string;
    methods: MfaMethod[];
}
