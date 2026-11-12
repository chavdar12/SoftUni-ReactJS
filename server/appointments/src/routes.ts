import {Router} from 'express';
import * as appointments from './controllers/appointments.controller.ts';
import * as records from './controllers/records.controller.ts';
import {stream} from './lib/events.ts';
import {authenticate, requireRole} from '#shared/middleware/auth.ts';
import {idempotent} from './middleware/idempotency.ts';
import {validate} from '#shared/middleware/validate.ts';
import {idParams} from '#shared/schemas.ts';
import {
    availabilityQueryDto,
    bookDto,
    cancelDto,
    listQueryDto,
    prescribeDto,
    rateDto,
    refillDecisionDto,
    rescheduleDto,
} from './dto/appointment.dto.ts';
import {addNoteDto, patientParams} from './dto/record.dto.ts';

/** Appointments service: bookings, prescriptions, ratings, refills and medical records. Every input is a zod-validated DTO. */
export const routes = Router();

routes.use(authenticate);

// validate runs before idempotent so a rejected request doesn't burn its key.
routes.get('/appointments', validate({query: listQueryDto}), appointments.list);
routes.get('/appointments/availability', validate({query: availabilityQueryDto}), appointments.availability);
routes.post('/appointments', requireRole('patient'), validate({body: bookDto}), idempotent, appointments.book);
routes.patch('/appointments/:id', requireRole('patient'), validate({params: idParams, body: rescheduleDto}), appointments.reschedule);
routes.patch(
    '/appointments/:id/cancel',
    requireRole('patient', 'doctor'),
    validate({params: idParams, body: cancelDto}),
    appointments.cancel,
);
routes.post(
    '/appointments/:id/prescription',
    requireRole('doctor'),
    validate({params: idParams, body: prescribeDto}),
    idempotent,
    appointments.prescribe,
);
routes.post('/appointments/:id/rating', requireRole('patient'), validate({params: idParams, body: rateDto}), appointments.rate);
routes.post('/appointments/:id/refill', requireRole('patient'), validate({params: idParams}), appointments.requestRefill);
routes.patch(
    '/appointments/:id/refill',
    requireRole('doctor'),
    validate({params: idParams, body: refillDecisionDto}),
    appointments.decideRefill,
);

routes.get('/prescriptions', validate({query: listQueryDto}), appointments.listPrescriptions);
routes.get('/ratings', appointments.ratings);
routes.get('/stats', requireRole('admin'), appointments.stats);
routes.get('/events', stream);

routes.get('/history/:patientId', requireRole('patient', 'doctor'), validate({params: patientParams}), records.history);
routes.post('/notes', requireRole('doctor'), validate({body: addNoteDto}), records.addNote);
