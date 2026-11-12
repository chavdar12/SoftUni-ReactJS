import type {Request, Response} from 'express';
import type {z} from 'zod';
import {Appointment} from '../models/Appointment.ts';
import {getDoctor} from '../lib/identityClient.ts';
import {HttpError} from '../../../shared/src/lib/HttpError.ts';
import type {AuthUser} from '../../../shared/src/lib/jwt.ts';
import type {bookBody, prescribeBody} from '../schemas.ts';

/** Admins see everything; doctors and patients only their own. */
const ownedBy = (u: AuthUser) =>
    u.role === 'admin' ? {} : u.role === 'doctor' ? {doctorId: u.id} : {patientId: u.id};

export async function list(req: Request, res: Response) {
    res.json(await Appointment.find(ownedBy(req.user)).sort('-date'));
}

export async function book(req: Request, res: Response) {
    const {doctorId, date} = req.body as z.infer<typeof bookBody>;
    const doctor = await getDoctor(req, doctorId);
    const appointment = await Appointment.create({
        patientId: req.user.id,
        patientName: req.user.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        roomNumber: doctor.roomNumber,
        date,
    });
    res.status(201).json(appointment);
}

export async function cancel(req: Request, res: Response) {
    const appointment = await Appointment.findOneAndUpdate(
        {_id: req.params.id, status: 'active', ...ownedBy(req.user)},
        {status: 'cancelled', closedBy: req.user.name},
        {returnDocument: 'after'},
    );
    if (!appointment) throw new HttpError(404, 'No active appointment found');
    res.json(appointment);
}

export async function prescribe(req: Request, res: Response) {
    const prescription = req.body as z.infer<typeof prescribeBody>;
    const appointment = await Appointment.findOneAndUpdate(
        {_id: req.params.id, status: 'active', doctorId: req.user.id},
        {status: 'done', closedBy: req.user.name, prescription},
        {returnDocument: 'after'},
    );
    if (!appointment) throw new HttpError(404, 'No active appointment found');
    res.status(201).json(appointment);
}

export async function listPrescriptions(req: Request, res: Response) {
    const done = await Appointment.find({...ownedBy(req.user), status: 'done'}).sort('-date');
    res.json(
        done.map((a) => ({
            id: a.id,
            patientName: a.patientName,
            doctorName: a.doctorName,
            date: a.date,
            disease: a.prescription?.disease,
            medication: a.prescription?.medication,
        })),
    );
}
