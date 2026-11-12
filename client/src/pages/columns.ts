import type {Column} from '@/components/DataTable';
import {formatDateTime} from '@/lib/dates';
import type {Appointment, Prescription, User} from '@/api/types';

export const dateTime = (d: unknown) => (d ? formatDateTime(d as string) : '');

export const doctorColumns: Column<User>[] = [
    {id: 'name', label: 'Name'},
    {id: 'email', label: 'Email'},
    {id: 'specialization', label: 'Specialization'},
    {id: 'roomNumber', label: 'Room'},
];

export const patientColumns: Column<User>[] = [
    {id: 'name', label: 'Name'},
    {id: 'email', label: 'Email'},
    {id: 'phone', label: 'Phone'},
];

export const appointmentColumns: Column<Appointment>[] = [
    {id: 'patientName', label: 'Patient'},
    {id: 'doctorName', label: 'Doctor'},
    {id: 'specialization', label: 'Specialization'},
    {id: 'roomNumber', label: 'Room'},
    {id: 'date', label: 'Date', format: dateTime},
    {id: 'reason', label: 'Reason'},
    {id: 'status', label: 'Status', format: (s, a) => (a.cancelReason ? `${s} (${a.cancelReason})` : (s as string))},
];

export const prescriptionColumns: Column<Prescription>[] = [
    {id: 'patientName', label: 'Patient'},
    {id: 'doctorName', label: 'Doctor'},
    {id: 'date', label: 'Date', format: dateTime},
    {id: 'disease', label: 'Diagnosis'},
    {id: 'medication', label: 'Medication'},
    {id: 'refillStatus', label: 'Refill'},
];
