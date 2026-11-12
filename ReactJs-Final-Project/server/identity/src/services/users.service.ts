import {HttpError} from '#shared/lib/HttpError.ts';
import {redis} from '#shared/lib/redis.ts';
import {logger} from '#shared/lib/logger.ts';
import {DEFAULT_HOURS} from '#shared/lib/hours.ts';
import {userRepository} from '#identity/repositories/user.repository.ts';
import {revokeAllRefreshTokens} from '#identity/lib/tokens.ts';
import {type CreateDoctorDto, toUserDto, type UpdateDoctorDto, type UserDto} from '#identity/dto/user.dto.ts';
import {hashPassword} from './helpers.ts';

// Doctors are read on every booking and change rarely: cache the list, drop it on any write.
// The cache is optional: if Redis is down, read Mongo instead of failing.
const DOCTORS_CACHE = 'cache:doctors';
const cacheFailed = (op: string) => (err: unknown) => logger.warn(`doctor cache ${op} failed`, {err});
const dropCache = () => redis.del(DOCTORS_CACHE).catch(cacheFailed('invalidate'));

export async function listDoctors(): Promise<{doctors: UserDto[]; cached: boolean}> {
    const json = await redis.get(DOCTORS_CACHE).catch(cacheFailed('read'));
    if (json) return {doctors: JSON.parse(json), cached: true};
    const doctors = (await userRepository.listActiveDoctors()).map(toUserDto);
    void redis.set(DOCTORS_CACHE, JSON.stringify(doctors), 'EX', 300).catch(cacheFailed('write'));
    return {doctors, cached: false};
}

export async function createDoctor({password, workingHours = DEFAULT_HOURS, ...profile}: CreateDoctorDto) {
    const doctor = await userRepository.create({...profile, workingHours, passwordHash: await hashPassword(password), role: 'doctor'});
    await dropCache();
    return toUserDto(doctor);
}

export async function getDoctor(id: string) {
    const doctor = await userRepository.findActiveDoctor(id);
    if (!doctor) throw new HttpError(404, 'Doctor not found');
    return toUserDto(doctor);
}

export async function updateDoctor(id: string, changes: UpdateDoctorDto) {
    const doctor = await userRepository.updateActiveDoctor(id, changes);
    if (!doctor) throw new HttpError(404, 'Doctor not found');
    await dropCache();
    return toUserDto(doctor);
}

/** Deactivates: the doctor can't sign in or be booked, but past appointments keep their history. */
export async function deactivateDoctor(id: string) {
    const doctor = await userRepository.deactivateDoctor(id);
    if (!doctor) throw new HttpError(404, 'Doctor not found');
    await Promise.all([dropCache(), revokeAllRefreshTokens(doctor.id)]);
}

export const listPatients = async () => (await userRepository.listPatients()).map(toUserDto);
