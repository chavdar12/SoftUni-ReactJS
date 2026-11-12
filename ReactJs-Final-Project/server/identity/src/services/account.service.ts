import bcrypt from 'bcryptjs';
import {HttpError} from '#shared/lib/HttpError.ts';
import type {AuthUser} from '#shared/lib/jwt.ts';
import {userRepository} from '#identity/repositories/user.repository.ts';
import {revokeAllRefreshTokens} from '#identity/lib/tokens.ts';
import {toUserDto} from '#identity/dto/user.dto.ts';
import type {ChangePasswordDto, SessionDto, UpdateProfileDto} from '#identity/dto/auth.dto.ts';
import {findAccount, hashPassword} from './helpers.ts';
import {accessTokenFor, startSession} from './session.service.ts';

/** Returns a fresh access token too, so a new name shows up in tokens (and new bookings) right away. */
export async function updateProfile(me: AuthUser, changes: UpdateProfileDto): Promise<SessionDto> {
    if (me.role !== 'doctor') delete changes.workingHours;
    const user = await findAccount(me.id);
    if (changes.phone && changes.phone !== user.phone) user.phoneVerified = false; // a new number needs verifying
    user.set(changes);
    await userRepository.save(user);
    return {accessToken: accessTokenFor(user), user: toUserDto(user)};
}

/** Signs out every other device and starts a fresh session on this one. */
export async function changePassword(userId: string, {currentPassword, newPassword}: ChangePasswordDto) {
    const user = await userRepository.findById(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw new HttpError(400, 'Current password is wrong');
    }
    user.passwordHash = await hashPassword(newPassword);
    await userRepository.save(user);
    await revokeAllRefreshTokens(user.id);
    return startSession(user);
}

/** Access tokens already issued stay valid until they expire (15 min). */
export const logoutEverywhere = (userId: string) => revokeAllRefreshTokens(userId);
