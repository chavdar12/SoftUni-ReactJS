import {Router} from 'express';
import * as auth from './controllers/auth.controller.ts';
import * as users from './controllers/users.controller.ts';
import {authenticate, requireRole} from '../../shared/src/middleware/auth.ts';
import {validate} from '../../shared/src/middleware/validate.ts';
import {idParams} from '../../shared/src/schemas.ts';
import {doctorBody, loginBody, signupBody} from './schemas.ts';

/** Identity service: accounts, sessions, and the doctor/patient directory. */
export const routes = Router();

routes.post('/auth/signup', validate({body: signupBody}), auth.signup);
routes.post('/auth/login', validate({body: loginBody}), auth.login);
routes.post('/auth/refresh', auth.refresh);
routes.post('/auth/logout', auth.logout);

routes.use(authenticate);

routes.get('/doctors', users.listDoctors);
routes.get('/doctors/:id', validate({params: idParams}), users.getDoctor);
routes.post('/doctors', requireRole('admin'), validate({body: doctorBody}), users.createDoctor);
routes.delete('/doctors/:id', requireRole('admin'), validate({params: idParams}), users.deleteDoctor);
routes.get('/patients', requireRole('admin'), users.listPatients);
