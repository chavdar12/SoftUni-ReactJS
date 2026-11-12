export type Role = 'admin' | 'doctor' | 'patient';

export interface WorkingHours {
    days: number[]; // 0 = Sunday
    start: string; // "HH:MM", clinic time
    end: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    phone?: string;
    specialization?: string;
    roomNumber?: number;
    workingHours?: WorkingHours;
}

export interface Session {
    accessToken: string;
    user: User;
}

export type Status = 'active' | 'cancelled' | 'done';
export type RefillStatus = 'requested' | 'approved' | 'denied';

export interface Appointment {
    id: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    specialization: string;
    roomNumber: number;
    date: string;
    reason?: string;
    status: Status;
    closedBy?: string;
    cancelReason?: string;
    prescription?: {disease: string; medication: string};
    rating?: number;
    refillStatus?: RefillStatus;
}

export interface Prescription {
    id: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    date: string;
    disease: string;
    medication: string;
    rating?: number;
    refillStatus?: RefillStatus;
}

export interface Slot {
    start: string;
    free: boolean;
}

export interface DoctorRating {
    doctorId: string;
    average: number;
    count: number;
}

export interface Stats {
    total: number;
    byStatus: Record<Status, number>;
    byDoctor: {doctorId: string; doctorName: string; count: number}[];
}

export interface Note {
    id: string;
    doctorName: string;
    text: string;
    createdAt: string;
}

export interface History {
    appointments: Appointment[];
    notes: Note[];
}

export interface ListParams {
    page: number;
    limit: number;
    q?: string;
    status?: Status;
    from?: string;
    to?: string;
}

export interface Paged<T> {
    items: T[];
    total: number;
}

export type MfaMethod = 'totp' | 'email';

/** /auth/login answers with a session, or asks for a second step. */
export type LoginResult = Session | {mfaRequired: true; mfaToken: string; methods: MfaMethod[]};

export interface Passkey {
    id: string;
    name: string;
    createdAt: string;
    lastUsedAt?: string;
}

export interface Security {
    email: string;
    emailVerified: boolean;
    phone: string | null;
    phoneVerified: boolean;
    totpEnabled: boolean;
    emailCodeLogin: boolean;
    passkeys: Passkey[];
}
