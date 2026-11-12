import {z} from 'zod';
import {objectId} from '#shared/schemas.ts';
import type {NoteDoc} from '#appointments/repositories/note.repository.ts';
import type {AppointmentDto} from './appointment.dto.ts';

// --- input ---

export const addNoteDto = z.object({patientId: objectId, text: z.string().trim().min(1).max(5000)});
export type AddNoteDto = z.infer<typeof addNoteDto>;

export const patientParams = z.object({patientId: objectId});

// --- output ---

export interface NoteDto {
    id: string;
    doctorName: string;
    text: string;
    createdAt: Date;
}

export const toNoteDto = (n: NoteDoc): NoteDto => ({id: n.id, doctorName: n.doctorName, text: n.text, createdAt: n.createdAt});

export interface HistoryDto {
    appointments: AppointmentDto[];
    notes: NoteDto[];
}
