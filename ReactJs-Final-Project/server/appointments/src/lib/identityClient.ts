import type {Request} from 'express';
import {config} from '../config.ts';
import {HttpError} from '../../../shared/src/lib/HttpError.ts';
import {logger} from '../../../shared/src/lib/logger.ts';

export interface Doctor {
    id: string;
    name: string;
    specialization: string;
    roomNumber: number;
}

/** Looks a doctor up in the identity service, forwarding the caller's token and request id. */
export async function getDoctor(req: Request, id: string): Promise<Doctor> {
    let res: Response;
    try {
        res = await fetch(`${config.identityUrl}/api/doctors/${id}`, {
            headers: {Authorization: req.get('Authorization') ?? '', 'X-Request-ID': req.res!.locals.reqId},
            signal: AbortSignal.timeout(3000),
        });
    } catch (err) {
        logger.error('identity service unreachable', {reqId: req.res!.locals.reqId, err});
        throw new HttpError(503, 'Doctor directory is unavailable, please retry');
    }
    if (res.status === 404) throw new HttpError(404, 'Doctor not found');
    if (!res.ok) throw new HttpError(503, 'Doctor directory is unavailable, please retry');
    return res.json() as Promise<Doctor>;
}
