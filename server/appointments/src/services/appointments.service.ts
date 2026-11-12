import {HttpError} from '#shared/lib/HttpError.ts';
import {DEFAULT_HOURS} from '#shared/lib/hours.ts';
import type {AuthUser} from '#shared/lib/jwt.ts';
import {config} from '#appointments/config.ts';
import {appointmentRepository} from '#appointments/repositories/appointment.repository.ts';
import {type Caller, type Doctor, getDoctor} from '#appointments/lib/identityClient.ts';
import {daySlots, isWorkingSlot} from '#appointments/lib/slots.ts';
import {ownedBy, tooLateToChange} from '#appointments/lib/policy.ts';
import {publishChange} from '#appointments/lib/events.ts';
import {
    type AppointmentDto,
    type AvailabilityQueryDto,
    type BookDto,
    type CancelDto,
    type ListQueryDto,
    type PageDto,
    type PrescribeDto,
    type PrescriptionDto,
    type RatingDto,
    type RescheduleDto,
    type SlotDto,
    type StatsDto,
    toAppointmentDto,
    toPrescriptionDto,
} from '#appointments/dto/appointment.dto.ts';

const slotTaken = (err: any): never => {
    throw err?.code === 11000 ? new HttpError(409, 'That time slot is already taken') : err;
};

function assertWorkingSlot(doctor: Doctor, date: Date) {
    if (!isWorkingSlot(date, doctor.workingHours ?? DEFAULT_HOURS, config.clinicTz)) {
        throw new HttpError(400, 'The doctor is not working at that time');
    }
}

const criteria = (me: AuthUser, {q, status, from, to}: ListQueryDto) => ({
    owner: ownedBy(me),
    status,
    q,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
});

/** Admins see everything; doctors and patients only their own. */
export async function list(me: AuthUser, query: ListQueryDto): Promise<PageDto<AppointmentDto>> {
    const {rows, total} = await appointmentRepository.page(criteria(me, query), query.page, query.limit);
    return {items: rows.map(toAppointmentDto), total};
}

export async function listPrescriptions(me: AuthUser, query: ListQueryDto): Promise<PageDto<PrescriptionDto>> {
    const {rows, total} = await appointmentRepository.page({...criteria(me, query), status: 'done'}, query.page, query.limit);
    return {items: rows.map(toPrescriptionDto), total};
}

/** A doctor's slots on one day, each marked free or not. */
export async function availability(caller: Caller, {doctorId, day}: AvailabilityQueryDto): Promise<SlotDto[]> {
    const doctor = await getDoctor(caller, doctorId);
    const slots = daySlots(day, doctor.workingHours ?? DEFAULT_HOURS, config.clinicTz);
    const taken = await appointmentRepository.takenSlots(doctorId, slots);
    const now = Date.now();
    return slots.map((s) => ({start: s, free: s.getTime() > now && !taken.has(s.getTime())}));
}

export async function book(me: AuthUser, caller: Caller, {doctorId, date, reason}: BookDto) {
    const doctor = await getDoctor(caller, doctorId);
    assertWorkingSlot(doctor, new Date(date));
    const appointment = await appointmentRepository
        .create({
            patientId: me.id,
            patientName: me.name,
            patientEmail: me.email,
            doctorId: doctor.id,
            doctorName: doctor.name,
            specialization: doctor.specialization,
            roomNumber: doctor.roomNumber,
            date,
            reason: reason || undefined,
        })
        .catch(slotTaken);
    publishChange(appointment);
    return toAppointmentDto(appointment);
}

/** The caller's active appointment, refusing patients inside the cutoff. */
async function changeable(me: AuthUser, id: string) {
    const appointment = await appointmentRepository.findActive(id, ownedBy(me));
    if (!appointment) throw new HttpError(404, 'No active appointment found');
    if (me.role === 'patient' && tooLateToChange(appointment.date)) {
        throw new HttpError(409, 'Appointments can only be changed up to 2 hours before they start');
    }
    return appointment;
}

export async function cancel(me: AuthUser, id: string, {reason}: CancelDto) {
    await changeable(me, id);
    const appointment = await appointmentRepository.cancel(id, me.name, reason || undefined);
    if (!appointment) throw new HttpError(404, 'No active appointment found');
    publishChange(appointment);
    return toAppointmentDto(appointment);
}

export async function reschedule(me: AuthUser, caller: Caller, id: string, {date}: RescheduleDto) {
    const current = await changeable(me, id);
    assertWorkingSlot(await getDoctor(caller, String(current.doctorId)), new Date(date));
    const appointment = await appointmentRepository.reschedule(id, new Date(date)).catch(slotTaken);
    if (!appointment) throw new HttpError(404, 'No active appointment found');
    publishChange(appointment);
    return toAppointmentDto(appointment);
}

export async function prescribe(me: AuthUser, id: string, prescription: PrescribeDto) {
    const appointment = await appointmentRepository.prescribe(id, me.id, me.name, prescription);
    if (!appointment) throw new HttpError(404, 'No active appointment found');
    publishChange(appointment);
    return toAppointmentDto(appointment);
}

export async function rate(me: AuthUser, id: string, stars: number) {
    const appointment = await appointmentRepository.rate(id, me.id, stars);
    if (!appointment) throw new HttpError(409, 'Only finished appointments can be rated, once');
    return toAppointmentDto(appointment);
}

export async function ratings(): Promise<RatingDto[]> {
    return (await appointmentRepository.averageRatings()).map((r) => ({...r, average: Math.round(r.average * 10) / 10}));
}

export async function requestRefill(me: AuthUser, id: string) {
    const appointment = await appointmentRepository.requestRefill(id, me.id);
    if (!appointment) throw new HttpError(409, 'A refill can’t be requested for this prescription');
    publishChange(appointment);
    return toAppointmentDto(appointment);
}

/** The prescribing doctor approves (a new finished entry with the same prescription) or denies. */
export async function decideRefill(me: AuthUser, id: string, approve: boolean) {
    const original = await appointmentRepository.decideRefill(id, me.id, approve);
    if (!original) throw new HttpError(404, 'No pending refill request found');
    if (approve) {
        const {patientId, patientName, patientEmail, doctorId, doctorName, specialization, roomNumber, prescription} = original;
        await appointmentRepository
            .create({
                patientId, patientName, patientEmail, doctorId, doctorName, specialization, roomNumber, prescription,
                date: new Date(),
                status: 'done',
                closedBy: me.name,
                refillOf: original._id,
            })
            .catch(async (err) => {
                // No transactions on a standalone Mongo: put the request back so the doctor can retry.
                await appointmentRepository.reopenRefill(original._id);
                throw err;
            });
    }
    publishChange(original);
    return toAppointmentDto(original);
}

/** Admin dashboard: counts by status and the busiest doctors. */
export async function stats(): Promise<StatsDto> {
    const result = await appointmentRepository.stats();
    const byStatus = {active: 0, cancelled: 0, done: 0};
    for (const s of result.byStatus) byStatus[s._id] = s.count;
    return {
        total: byStatus.active + byStatus.cancelled + byStatus.done,
        byStatus,
        byDoctor: result.byDoctor.map((d) => ({doctorId: String(d._id), doctorName: d.doctorName, count: d.count})),
    };
}
