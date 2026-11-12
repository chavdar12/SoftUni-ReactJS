import {keepPreviousData, type QueryClient, type QueryKey, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {startAuthentication, startRegistration} from '@simplewebauthn/browser';
import {endSession, http, idempotencyKey, refreshSession, setAccessToken} from './client';
import {sessionKey} from './queryClient';
import type {
    Appointment,
    DoctorRating,
    History,
    ListParams,
    LoginResult,
    MfaMethod,
    Paged,
    Prescription,
    Security,
    Session,
    Slot,
    Stats,
    User,
    WorkingHours,
} from './types';

export const keys = {
    doctors: ['doctors'],
    patients: ['patients'],
    appointments: ['appointments'],
    prescriptions: ['prescriptions'],
    ratings: ['ratings'],
    stats: ['stats'],
    history: ['history'],
    security: ['security'],
};

const get = <T>(url: string) => () => http.get<T>(url).then((r) => r.data);
const idempotent = () => ({headers: {'Idempotency-Key': idempotencyKey()}});

/** Largest page the server allows; used to fetch "everything" for CSV export. */
export const EXPORT_LIMIT = 1000;

/** A server-paged list: rows in the body, total in X-Total-Count. */
export const fetchPage = <T>(url: string, params: Partial<ListParams>) =>
    http.get<T[]>(url, {params}).then((r): Paged<T> => ({
        items: r.data,
        total: Number(r.headers?.['x-total-count'] ?? r.data.length),
    }));

/** Search + page a list the server sends whole. */
export function pageLocally<T extends object>(rows: T[], {page, limit, q}: ListParams): Paged<T> {
    const needle = q?.trim().toLowerCase();
    const hits = needle
        ? rows.filter((r) => Object.values(r).some((v) => typeof v !== 'object' && String(v).toLowerCase().includes(needle)))
        : rows;
    return {items: hits.slice(page * limit, (page + 1) * limit), total: hits.length};
}

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

function startSession(qc: QueryClient, {accessToken, user}: Session) {
    setAccessToken(accessToken);
    qc.setQueryData(sessionKey, user);
}

function useSessionMutation<V>(send: (body: V) => Promise<{data: Session}>) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: V) => send(body).then((r) => r.data),
        onSuccess: (s) => startSession(qc, s),
    });
}

/** Signs in, unless the account needs a second step: then the result carries `mfaRequired`. */
export function useLogin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (b: {email: string; password: string}) => http.post<LoginResult>('/auth/login', b).then((r) => r.data),
        onSuccess: (result) => {
            if ('accessToken' in result) startSession(qc, result);
        },
    });
}

export const useVerifyMfa = () =>
    useSessionMutation((b: {mfaToken: string; method: MfaMethod; code: string}) => http.post<Session>('/auth/mfa', b));
export const useSendLoginCode = () =>
    useMutation({mutationFn: (mfaToken: string) => http.post('/auth/mfa/email', {mfaToken})});

/** Passwordless: the browser lets the user pick one of their passkeys for this site. */
export const usePasskeyLogin = () =>
    useSessionMutation(async (_: void) => {
        const {data: optionsJSON} = await http.post('/auth/passkey/options');
        const response = await startAuthentication({optionsJSON});
        return http.post<Session>('/auth/passkey', {response});
    });
export const useSignup = () =>
    useSessionMutation((b: {name: string; email: string; phone: string; password: string}) =>
        http.post<Session>('/auth/signup', b),
    );

export const useLogout = () => useMutation({mutationFn: () => http.post('/auth/logout'), onSettled: endSession});
export const useLogoutEverywhere = () => useMutation({mutationFn: () => http.delete('/me/sessions'), onSuccess: endSession});

export const useForgotPassword = () => useMutation({mutationFn: (b: {email: string}) => http.post('/auth/forgot', b)});
export const useResetPassword = () =>
    useMutation({mutationFn: (b: {token: string; password: string}) => http.post('/auth/reset', b)});

export interface ProfileChanges {
    name?: string;
    phone?: string;
    workingHours?: WorkingHours;
}

export const useUpdateProfile = () => useSessionMutation((b: ProfileChanges) => http.patch<Session>('/me', b));
export const useChangePassword = () =>
    useSessionMutation((b: {currentPassword: string; newPassword: string}) => http.patch<Session>('/me/password', b));

// --- reads ---

export const useDoctors = () => useQuery({queryKey: keys.doctors, queryFn: get<User[]>('/doctors')});
export const useDoctorsPage = (p: ListParams) =>
    useQuery({queryKey: keys.doctors, queryFn: get<User[]>('/doctors'), select: (rows) => pageLocally(rows, p)});
export const usePatientsPage = (p: ListParams) =>
    useQuery({queryKey: keys.patients, queryFn: get<User[]>('/patients'), select: (rows) => pageLocally(rows, p)});

export const useAppointments = (p: ListParams) =>
    useQuery({
        queryKey: [...keys.appointments, p],
        queryFn: () => fetchPage<Appointment>('/appointments', p),
        placeholderData: keepPreviousData,
    });
export const usePrescriptions = (p: ListParams) =>
    useQuery({
        queryKey: [...keys.prescriptions, p],
        queryFn: () => fetchPage<Prescription>('/prescriptions', p),
        placeholderData: keepPreviousData,
    });

/** `day` is YYYY-MM-DD. */
export const useAvailability = (doctorId: string, day: string) =>
    useQuery({
        queryKey: [...keys.appointments, 'availability', doctorId, day],
        queryFn: () => http.get<Slot[]>('/appointments/availability', {params: {doctorId, day}}).then((r) => r.data),
        enabled: !!doctorId && !!day,
    });

export const useRatings = () => useQuery({queryKey: keys.ratings, queryFn: get<DoctorRating[]>('/ratings')});
export const useStats = () => useQuery({queryKey: keys.stats, queryFn: get<Stats>('/stats')});
export const useHistory = (patientId: string) =>
    useQuery({queryKey: [...keys.history, patientId], queryFn: get<History>(`/history/${patientId}`)});

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

export const useUpdateDoctor = () =>
    useApiMutation(
        ({id, ...changes}: {id: string; name?: string; specialization?: string; roomNumber?: number; workingHours?: WorkingHours}) =>
            http.patch<User>(`/doctors/${id}`, changes).then((r) => r.data),
        keys.doctors,
    );

export const useDeleteDoctor = () => useApiMutation((id: string) => http.delete(`/doctors/${id}`), keys.doctors);

/** `date` is an ISO instant (a slot start from the availability endpoint). */
export const useBookAppointment = () =>
    useApiMutation(
        (body: {doctorId: string; date: string; reason?: string}) =>
            http.post<Appointment>('/appointments', body, idempotent()),
        keys.appointments,
        keys.stats,
    );

export const useReschedule = () =>
    useApiMutation(({id, date}: {id: string; date: string}) => http.patch(`/appointments/${id}`, {date}), keys.appointments);

export const useCancelAppointment = () =>
    useApiMutation(
        ({id, reason}: {id: string; reason?: string}) => http.patch(`/appointments/${id}/cancel`, {reason}),
        keys.appointments,
        keys.stats,
    );

export const usePrescribe = () =>
    useApiMutation(
        ({id, ...body}: {id: string; disease: string; medication: string}) =>
            http.post(`/appointments/${id}/prescription`, body, idempotent()),
        keys.appointments,
        keys.prescriptions,
        keys.stats,
    );

export const useRate = () =>
    useApiMutation(
        ({id, stars}: {id: string; stars: number}) => http.post(`/appointments/${id}/rating`, {stars}),
        keys.prescriptions,
        keys.appointments,
        keys.ratings,
    );

export const useRequestRefill = () =>
    useApiMutation((id: string) => http.post(`/appointments/${id}/refill`), keys.prescriptions);

export const useDecideRefill = () =>
    useApiMutation(
        ({id, approve}: {id: string; approve: boolean}) => http.patch(`/appointments/${id}/refill`, {approve}),
        keys.prescriptions,
        keys.appointments,
    );

// --- account security ---

export const useSecurity = () => useQuery({queryKey: keys.security, queryFn: get<Security>('/me/security')});

const useSecurityMutation = <V,>(fn: (v: V) => Promise<unknown>) => useApiMutation(fn, keys.security);

export const useSendEmailCode = () => useSecurityMutation((_: void) => http.post('/me/email/code'));
export const useVerifyEmail = () => useSecurityMutation((code: string) => http.post('/me/email/verify', {code}));
export const useSendPhoneCode = () => useSecurityMutation((_: void) => http.post('/me/phone/code'));
export const useVerifyPhone = () => useSecurityMutation((code: string) => http.post('/me/phone/verify', {code}));
export const useEmailCodeLogin = () =>
    useSecurityMutation((emailCodeLogin: boolean) => http.patch('/me/security', {emailCodeLogin}));

export const useStartTotp = () =>
    useMutation({mutationFn: () => http.post<{secret: string; otpauthUrl: string}>('/me/totp/setup').then((r) => r.data)});
export const useConfirmTotp = () => useSecurityMutation((code: string) => http.post('/me/totp', {code}));
export const useRemoveTotp = () => useSecurityMutation((code: string) => http.delete('/me/totp', {data: {code}}));

/** Re-checks the password, creates a passkey on this device (the browser/OS prompts), registers it as `name`. */
export const useAddPasskey = () =>
    useSecurityMutation(async ({name, password}: {name: string; password: string}) => {
        const {data: optionsJSON} = await http.post('/me/passkeys/options', {password});
        const response = await startRegistration({optionsJSON});
        return http.post('/me/passkeys', {name, response});
    });
export const useRenamePasskey = () =>
    useSecurityMutation(({id, name}: {id: string; name: string}) => http.patch(`/me/passkeys/${encodeURIComponent(id)}`, {name}));
export const useDeletePasskey = () =>
    useSecurityMutation((id: string) => http.delete(`/me/passkeys/${encodeURIComponent(id)}`));

export const useAddNote = () =>
    useApiMutation((b: {patientId: string; text: string}) => http.post('/notes', b), keys.history);
