import {z} from 'zod';
import {SPECIALIZATIONS} from '#identity/models/User.ts';
import {type WorkingHours, workingHoursSchema} from '#shared/lib/hours.ts';
import type {Role} from '#shared/lib/jwt.ts';
import type {UserDoc} from '#identity/repositories/user.repository.ts';

// --- input ---

export const name = z.string().trim().min(1).max(100);
/** E.164: +, country code, number. The client builds it from a country picker. */
export const phone = z.string().trim().regex(/^\+[1-9]\d{6,14}$/, 'Use international format, e.g. +359888123456');
export const password = z.string().min(6).max(200);

export const createDoctorDto = z.object({
    name,
    email: z.email().max(200),
    password,
    specialization: z.enum(SPECIALIZATIONS),
    roomNumber: z.coerce.number().int().min(1).max(10_000),
    workingHours: workingHoursSchema.optional(),
});
export type CreateDoctorDto = z.infer<typeof createDoctorDto>;

export const updateDoctorDto = createDoctorDto.omit({email: true, password: true}).partial();
export type UpdateDoctorDto = z.infer<typeof updateDoctorDto>;

// --- output ---

/** What clients see of an account. Security details are in SecurityDto, for the owner only. */
export interface UserDto {
    id: string;
    name: string;
    email: string;
    role: Role;
    phone?: string;
    specialization?: string;
    roomNumber?: number;
    workingHours?: WorkingHours;
}

export const toUserDto = (u: UserDoc): UserDto => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    phone: u.phone ?? undefined,
    specialization: u.specialization ?? undefined,
    roomNumber: u.roomNumber ?? undefined,
    workingHours: u.workingHours ? {days: [...u.workingHours.days], start: u.workingHours.start!, end: u.workingHours.end!} : undefined,
});
