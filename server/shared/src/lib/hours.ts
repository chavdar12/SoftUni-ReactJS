import {z} from 'zod';

/** A doctor's weekly hours in clinic time: weekdays (0 = Sunday) and "HH:MM" start/end. */
export interface WorkingHours {
    days: number[];
    start: string;
    end: string;
}

export const DEFAULT_HOURS: WorkingHours = {days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00'};
export const SLOT_MINUTES = 30;

export const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

const time = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, 'Use HH:00 or HH:30');

export const workingHoursSchema = z
    .object({
        days: z.array(z.number().int().min(0).max(6)).min(1).max(7)
            .refine((d) => new Set(d).size === d.length, 'Duplicate day'),
        start: time,
        end: time,
    })
    .refine((h) => toMinutes(h.start) < toMinutes(h.end), {message: 'End must be after start', path: ['end']});
