import type {Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import type {z} from 'zod';
import {User} from '../models/User.ts';
import type {doctorBody} from '../schemas.ts';
import {HttpError} from '../../../shared/src/lib/HttpError.ts';
import {redis} from '../../../shared/src/lib/redis.ts';
import {logger} from '../../../shared/src/lib/logger.ts';

// Doctors are read on every booking and change rarely: cache the list, drop it on any write.
// The cache is optional: if Redis is down, read Mongo instead of failing.
const DOCTORS_CACHE = 'cache:doctors';
const cacheFailed = (op: string) => (err: unknown) => logger.warn(`doctor cache ${op} failed`, {err});
const dropCache = () => redis.del(DOCTORS_CACHE).catch(cacheFailed('invalidate'));

export async function listDoctors(_req: Request, res: Response) {
    let json = await redis.get(DOCTORS_CACHE).catch(cacheFailed('read'));
    res.set('X-Cache', json ? 'HIT' : 'MISS');
    if (!json) {
        json = JSON.stringify(await User.find({role: 'doctor'}).sort('name'));
        void redis.set(DOCTORS_CACHE, json, 'EX', 300).catch(cacheFailed('write'));
    }
    res.type('json').send(json);
}

export async function createDoctor(req: Request, res: Response) {
    const {password, ...profile} = req.body as z.infer<typeof doctorBody>;
    const doctor = await User.create({...profile, passwordHash: await bcrypt.hash(password, 10), role: 'doctor'});
    await dropCache();
    res.status(201).json(doctor);
}

export async function getDoctor(req: Request, res: Response) {
    const doctor = await User.findOne({_id: req.params.id, role: 'doctor'});
    if (!doctor) throw new HttpError(404, 'Doctor not found');
    res.json(doctor);
}

export async function deleteDoctor(req: Request, res: Response) {
    const doctor = await User.findOneAndDelete({_id: req.params.id, role: 'doctor'});
    if (!doctor) throw new HttpError(404, 'Doctor not found');
    await dropCache();
    res.status(204).end();
}

export async function listPatients(_req: Request, res: Response) {
    res.json(await User.find({role: 'patient'}).sort('name'));
}
