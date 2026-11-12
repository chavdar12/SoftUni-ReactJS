import {type QueryKey, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {endSession, http, idempotencyKey, refreshSession, setAccessToken} from './client';
import {sessionKey} from './queryClient';
import type {Appointment, Prescription, Session, User} from './types';

const keys = {
    doctors: ['doctors'],
    patients: ['patients'],
    appointments: ['appointments'],
    prescriptions: ['prescriptions'],
};

const get = <T>(url: string) => () => http.get<T>(url).then((r) => r.data);
const idempotent = () => ({headers: {'Idempotency-Key': idempotencyKey()}});

function useApiMutation<V, R>(mutationFn: (vars: V) => Promise<R>, ...invalidate: QueryKey[]) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({queryKey}))),
    });
}

// --- session ---

/** The signed-in user, or null. Restored on load from the refresh cookie. */
export const useSession = () =>
    useQuery({
        queryKey: sessionKey,
        queryFn: () => refreshSession().then((s): User | null => s.user, () => null),
        staleTime: Infinity,
        retry: false,
    });

function useSessionMutation<V>(url: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: V) => http.post<Session>(url, body).then((r) => r.data),
        onSuccess: ({accessToken, user}) => {
            setAccessToken(accessToken);
            qc.setQueryData(sessionKey, user);
        },
    });
}

export const useLogin = () => useSessionMutation<{email: string; password: string}>('/auth/login');
export const useSignup = () =>
    useSessionMutation<{name: string; email: string; phone: string; password: string}>('/auth/signup');

export const useLogout = () => useMutation({mutationFn: () => http.post('/auth/logout'), onSettled: endSession});

// --- reads ---

export const useDoctors = () => useQuery({queryKey: keys.doctors, queryFn: get<User[]>('/doctors')});
export const usePatients = () => useQuery({queryKey: keys.patients, queryFn: get<User[]>('/patients')});
export const useAppointments = () =>
    useQuery({queryKey: keys.appointments, queryFn: get<Appointment[]>('/appointments')});
export const usePrescriptions = () =>
    useQuery({queryKey: keys.prescriptions, queryFn: get<Prescription[]>('/prescriptions')});

// --- writes ---

interface NewDoctor {
    name: string;
    email: string;
    password: string;
    specialization: string;
    roomNumber: number;
}

export const useCreateDoctor = () =>
    useApiMutation((d: NewDoctor) => http.post<User>('/doctors', d).then((r) => r.data), keys.doctors);

export const useDeleteDoctor = () => useApiMutation((id: string) => http.delete(`/doctors/${id}`), keys.doctors);

/** `date` is a datetime-local value; it is sent as UTC ISO so every viewer sees the same instant. */
export const useBookAppointment = () =>
    useApiMutation(
        ({doctorId, date}: {doctorId: string; date: string}) =>
            http.post<Appointment>('/appointments', {doctorId, date: new Date(date).toISOString()}, idempotent()),
        keys.appointments,
    );

export const useCancelAppointment = () =>
    useApiMutation((id: string) => http.patch(`/appointments/${id}/cancel`), keys.appointments);

export const usePrescribe = () =>
    useApiMutation(
        ({id, ...body}: {id: string; disease: string; medication: string}) =>
            http.post(`/appointments/${id}/prescription`, body, idempotent()),
        keys.appointments,
        keys.prescriptions,
    );
