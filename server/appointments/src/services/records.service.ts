import {HttpError} from '#shared/lib/HttpError.ts';
import type {AuthUser} from '#shared/lib/jwt.ts';
import {appointmentRepository} from '#appointments/repositories/appointment.repository.ts';
import {noteRepository} from '#appointments/repositories/note.repository.ts';
import {toAppointmentDto} from '#appointments/dto/appointment.dto.ts';
import {type AddNoteDto, type HistoryDto, toNoteDto} from '#appointments/dto/record.dto.ts';

/** Medical records are open to the patient and to doctors who have (had) an appointment with them. Not admins. */
async function assertCanSee(me: AuthUser, patientId: string) {
    if (me.role === 'patient' && me.id === patientId) return;
    if (me.role === 'doctor' && (await appointmentRepository.hasSeen(patientId, me.id))) return;
    throw new HttpError(403, 'Forbidden');
}

/** A patient's appointments (every doctor) and notes, newest first. */
export async function history(me: AuthUser, patientId: string): Promise<HistoryDto> {
    await assertCanSee(me, patientId);
    const [appointments, notes] = await Promise.all([
        appointmentRepository.listForPatient(patientId),
        noteRepository.listForPatient(patientId),
    ]);
    return {appointments: appointments.map(toAppointmentDto), notes: notes.map(toNoteDto)};
}

export async function addNote(me: AuthUser, {patientId, text}: AddNoteDto) {
    await assertCanSee(me, patientId);
    return toNoteDto(await noteRepository.create({patientId, doctorId: me.id, doctorName: me.name, text}));
}
