import {z} from 'zod';
import {SPECIALIZATIONS} from './models/User.ts';

export const signupBody = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.email().max(200),
    phone: z.string().trim().min(6).max(30),
    password: z.string().min(6).max(200),
});

export const loginBody = z.object({email: z.email(), password: z.string().min(1).max(200)});

export const doctorBody = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.email().max(200),
    password: z.string().min(6).max(200),
    specialization: z.enum(SPECIALIZATIONS),
    roomNumber: z.coerce.number().int().min(1).max(10_000),
});
