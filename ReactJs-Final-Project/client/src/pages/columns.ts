import type {Column} from '../components/DataTable';
import type {Appointment, Prescription, User} from '../api/types';

const dateTime = (d: unknown) => (d ? new Date(d as string).toLocaleString() : '');

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
    {id: 'status', label: 'Status'},
];

export const prescriptionColumns: Column<Prescription>[] = [
    {id: 'patientName', label: 'Patient'},
    {id: 'doctorName', label: 'Doctor'},
    {id: 'date', label: 'Date', format: dateTime},
    {id: 'disease', label: 'Diagnosis'},
    {id: 'medication', label: 'Medication'},
];
