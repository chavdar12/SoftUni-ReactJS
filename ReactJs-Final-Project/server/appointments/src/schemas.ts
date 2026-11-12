import {z} from 'zod';
import {objectId} from '../../shared/src/schemas.ts';

export const bookBody = z.object({doctorId: objectId, date: z.iso.datetime()});

export const prescribeBody = z.object({
    disease: z.string().trim().min(1).max(500),
    medication: z.string().trim().min(1).max(2000),
});
