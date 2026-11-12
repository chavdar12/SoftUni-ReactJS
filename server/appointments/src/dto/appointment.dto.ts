import {z} from 'zod';
import {objectId} from '#shared/schemas.ts';
import {SLOT_MINUTES} from '#shared/lib/hours.ts';
import type {AppointmentDoc} from '#appointments/repositories/appointment.repository.ts';

// --- input ---

/** A future instant on a slot boundary (whole half hours, no seconds). */
const slot = z.iso
    .datetime()
    .refine((d) => new Date(d).getTime() > Date.now(), 'Must be in the future')
    .refine((d) => new Date(d).getTime() % (SLOT_MINUTES * 60_000) === 0, `Must start on a ${SLOT_MINUTES}-minute slot`);

export const bookDto = z.object({doctorId: objectId, date: slot, reason: z.string().trim().max(500).optional()});
export type BookDto = z.infer<typeof bookDto>;

export const rescheduleDto = z.object({date: slot});
export type RescheduleDto = z.infer<typeof rescheduleDto>;

export const cancelDto = z.object({reason: z.string().trim().max(500).optional()});
export type CancelDto = z.infer<typeof cancelDto>;

export const prescribeDto = z.object({
    disease: z.string().trim().min(1).max(500),
    medication: z.string().trim().min(1).max(2000),
});
export type PrescribeDto = z.infer<typeof prescribeDto>;

export const rateDto = z.object({stars: z.number().int().min(1).max(5)});
export type RateDto = z.infer<typeof rateDto>;

export const refillDecisionDto = z.object({approve: z.boolean()});
export type RefillDecisionDto = z.infer<typeof refillDecisionDto>;

// shortcut: CSV export asks for up to MAX_LIMIT rows; stream it server-side if lists outgrow that.
export const MAX_LIMIT = 1000;

export const listQueryDto = z.object({
    page: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(50),
    q: z.string().trim().max(100).optional(),
    status: z.enum(['active', 'cancelled', 'done']).optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
});
export type ListQueryDto = z.infer<typeof listQueryDto>;

export const availabilityQueryDto = z.object({doctorId: objectId, day: z.iso.date()});
export type AvailabilityQueryDto = z.infer<typeof availabilityQueryDto>;

// --- output ---

export type Status = 'active' | 'cancelled' | 'done';
export type RefillStatus = 'requested' | 'approved' | 'denied';

export interface AppointmentDto {
    id: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    specialization?: string;
    roomNumber?: number;
    date: Date;
    reason?: string;
    status: Status;
    closedBy?: string;
    cancelReason?: string;
    prescription?: {disease: string; medication: string};
    rating?: number;
    refillStatus?: RefillStatus;
    createdAt?: Date;
}

const opt = <T>(v: T | null | undefined) => v ?? undefined;

export const toAppointmentDto = (a: AppointmentDoc): AppointmentDto => ({
    id: a.id,
    patientId: String(a.patientId),
    patientName: a.patientName,
    doctorId: String(a.doctorId),
    doctorName: a.doctorName,
    specialization: opt(a.specialization),
    roomNumber: opt(a.roomNumber),
    date: a.date,
    reason: opt(a.reason),
    status: a.status as Status,
    closedBy: opt(a.closedBy),
    cancelReason: opt(a.cancelReason),
    prescription: a.prescription ? {disease: a.prescription.disease!, medication: a.prescription.medication!} : undefined,
    rating: opt(a.rating),
    refillStatus: opt(a.refillStatus) as RefillStatus | undefined,
    createdAt: opt(a.createdAt),
});

export interface PrescriptionDto {
    id: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    date: Date;
    disease?: string;
    medication?: string;
    rating?: number;
    refillStatus?: RefillStatus;
}

export const toPrescriptionDto = (a: AppointmentDoc): PrescriptionDto => ({
    id: a.id,
    patientId: String(a.patientId),
    patientName: a.patientName,
    doctorId: String(a.doctorId),
    doctorName: a.doctorName,
    date: a.date,
    disease: opt(a.prescription?.disease),
    medication: opt(a.prescription?.medication),
    rating: opt(a.rating),
    refillStatus: opt(a.refillStatus) as RefillStatus | undefined,
});

export interface PageDto<T> {
    items: T[];
    total: number;
}

export interface SlotDto {
    start: Date;
    free: boolean;
}

export interface RatingDto {
    doctorId: string;
    average: number;
    count: number;
}

export interface StatsDto {
    total: number;
    byStatus: Record<Status, number>;
    byDoctor: {doctorId: string; doctorName: string; count: number}[];
}
