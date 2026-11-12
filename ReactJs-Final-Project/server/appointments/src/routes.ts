import {Router} from 'express';
import * as appointments from './controllers/appointments.controller.ts';
import {authenticate, requireRole} from '../../shared/src/middleware/auth.ts';
import {idempotent} from './middleware/idempotency.ts';
import {validate} from '../../shared/src/middleware/validate.ts';
import {idParams} from '../../shared/src/schemas.ts';
import {bookBody, prescribeBody} from './schemas.ts';

/** Appointments service: bookings and the prescriptions written on them. */
export const routes = Router();

routes.use(authenticate);

// validate runs before idempotent so a rejected request doesn't burn its key.
routes.get('/appointments', appointments.list);
routes.post('/appointments', requireRole('patient'), validate({body: bookBody}), idempotent, appointments.book);
routes.patch('/appointments/:id/cancel', requireRole('patient', 'doctor'), validate({params: idParams}), appointments.cancel);
routes.post(
    '/appointments/:id/prescription',
    requireRole('doctor'),
    validate({params: idParams, body: prescribeBody}),
    idempotent,
    appointments.prescribe,
);
routes.get('/prescriptions', appointments.listPrescriptions);
