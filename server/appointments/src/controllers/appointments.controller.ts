import type {Request, Response} from 'express';
import * as appointments from '#appointments/services/appointments.service.ts';
import type {Caller} from '#appointments/lib/identityClient.ts';
import type {
    AvailabilityQueryDto,
    BookDto,
    CancelDto,
    ListQueryDto,
    PageDto,
    PrescribeDto,
    RateDto,
    RefillDecisionDto,
    RescheduleDto,
} from '#appointments/dto/appointment.dto.ts';

// HTTP only: inputs arrive validated (validate middleware + DTO schemas); the services hold the rules.

const id = (req: Request) => String(req.params.id);
const query = (req: Request) => req.query as unknown as ListQueryDto;
const caller = (req: Request, res: Response): Caller => ({authorization: req.get('Authorization') ?? '', reqId: res.locals.reqId});

/** The body stays a plain array; the total goes in X-Total-Count. */
const sendPage = <T>(res: Response, {items, total}: PageDto<T>) => res.set('X-Total-Count', String(total)).json(items);

export async function list(req: Request, res: Response) {
    sendPage(res, await appointments.list(req.user, query(req)));
}

export async function availability(req: Request, res: Response) {
    res.json(await appointments.availability(caller(req, res), req.query as unknown as AvailabilityQueryDto));
}

export async function book(req: Request, res: Response) {
    res.status(201).json(await appointments.book(req.user, caller(req, res), req.body as BookDto));
}

export async function cancel(req: Request, res: Response) {
    res.json(await appointments.cancel(req.user, id(req), req.body as CancelDto));
}

export async function reschedule(req: Request, res: Response) {
    res.json(await appointments.reschedule(req.user, caller(req, res), id(req), req.body as RescheduleDto));
}

export async function prescribe(req: Request, res: Response) {
    res.status(201).json(await appointments.prescribe(req.user, id(req), req.body as PrescribeDto));
}

export async function listPrescriptions(req: Request, res: Response) {
    sendPage(res, await appointments.listPrescriptions(req.user, query(req)));
}

export async function rate(req: Request, res: Response) {
    res.json(await appointments.rate(req.user, id(req), (req.body as RateDto).stars));
}

export async function ratings(_req: Request, res: Response) {
    res.json(await appointments.ratings());
}

export async function requestRefill(req: Request, res: Response) {
    res.json(await appointments.requestRefill(req.user, id(req)));
}

export async function decideRefill(req: Request, res: Response) {
    res.json(await appointments.decideRefill(req.user, id(req), (req.body as RefillDecisionDto).approve));
}

export async function stats(_req: Request, res: Response) {
    res.json(await appointments.stats());
}
