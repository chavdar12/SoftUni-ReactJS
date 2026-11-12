import {differenceInMinutes} from 'date-fns';
import type {AuthUser} from '#shared/lib/jwt.ts';

/** Patients can't cancel or move an appointment this close to its start. */
export const CHANGE_CUTOFF_MINUTES = 120;

export const tooLateToChange = (date: Date, now = new Date()) => differenceInMinutes(date, now) < CHANGE_CUTOFF_MINUTES;

/** Admins see everything; doctors and patients only their own. */
export const ownedBy = (u: AuthUser) =>
    u.role === 'admin' ? {} : u.role === 'doctor' ? {doctorId: u.id} : {patientId: u.id};

export interface Change {
    patientId: string;
    doctorId: string;
}

/** Whether a live-update stream of `user` should hear about `change`. */
export const shouldNotify = (user: AuthUser, change: Change) =>
    user.role === 'admin' || user.id === change.patientId || user.id === change.doctorId;

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
