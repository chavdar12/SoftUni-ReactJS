import bcrypt from 'bcryptjs';
import {HttpError} from '#shared/lib/HttpError.ts';
import {userRepository} from '#identity/repositories/user.repository.ts';

// Shared by several services; kept here so the services don't import each other in a circle.

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

export async function findAccount(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new HttpError(404, 'Account not found');
    return user;
}
