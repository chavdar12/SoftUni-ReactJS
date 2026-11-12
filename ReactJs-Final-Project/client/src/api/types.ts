export type Role = 'admin' | 'doctor' | 'patient';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    phone?: string;
    specialization?: string;
    roomNumber?: number;
}

export interface Session {
    accessToken: string;
    user: User;
}

export interface Appointment {
    id: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    specialization: string;
    roomNumber: number;
    date: string;
    status: 'active' | 'cancelled' | 'done';
    closedBy?: string;
}

export interface Prescription {
    id: string;
    patientName: string;
    doctorName: string;
    date: string;
    disease: string;
    medication: string;
}
