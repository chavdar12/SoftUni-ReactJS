import type {WorkingHours} from '#shared/lib/hours.ts';
import {config} from '#appointments/config.ts';
import {HttpError} from '#shared/lib/HttpError.ts';
import {logger} from '#shared/lib/logger.ts';

export interface Doctor {
    id: string;
    name: string;
    specialization: string;
    roomNumber: number;
    workingHours?: WorkingHours;
}

/** Who is calling, as identity needs it: their token (forwarded) and the request id (for tracing). */
export interface Caller {
    authorization: string;
    reqId: string;
}

/** Looks a doctor up in the identity service, forwarding the caller's token and request id. */
export async function getDoctor(caller: Caller, id: string): Promise<Doctor> {
    let res: Response;
    try {
        res = await fetch(`${config.identityUrl}/api/doctors/${id}`, {
            headers: {Authorization: caller.authorization, 'X-Request-ID': caller.reqId},
            signal: AbortSignal.timeout(3000),
        });
    } catch (err) {
        logger.error('identity service unreachable', {reqId: caller.reqId, err});
        throw new HttpError(503, 'Doctor directory is unavailable, please retry');
    }
    if (res.status === 404) throw new HttpError(404, 'Doctor not found');
    if (!res.ok) throw new HttpError(503, 'Doctor directory is unavailable, please retry');
    return res.json() as Promise<Doctor>;
}
