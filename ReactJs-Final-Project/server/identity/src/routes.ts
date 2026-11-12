import {Router} from 'express';
import * as auth from './controllers/auth.controller.ts';
import * as users from './controllers/users.controller.ts';
import * as security from './controllers/security.controller.ts';
import {authenticate, requireRole} from '#shared/middleware/auth.ts';
import {validate} from '#shared/middleware/validate.ts';
import {idParams} from '#shared/schemas.ts';
import {
    changePasswordDto,
    forgotPasswordDto,
    loginDto,
    mfaTokenDto,
    resetPasswordDto,
    signupDto,
    updateProfileDto,
    verifyMfaDto,
} from './dto/auth.dto.ts';
import {createDoctorDto, updateDoctorDto} from './dto/user.dto.ts';
import {
    addPasskeyDto,
    codeDto,
    passkeyLoginDto,
    passkeyOptionsDto,
    passkeyParams,
    renamePasskeyDto,
    updateSecurityDto,
} from './dto/security.dto.ts';

/** Identity service: accounts, sessions, and the doctor/patient directory. Every input is a zod-validated DTO. */
export const routes = Router();

routes.post('/auth/signup', validate({body: signupDto}), auth.signup);
routes.post('/auth/login', validate({body: loginDto}), auth.login);
routes.post('/auth/refresh', auth.refresh);
routes.post('/auth/logout', auth.logout);
routes.post('/auth/forgot', validate({body: forgotPasswordDto}), auth.forgotPassword);
routes.post('/auth/reset', validate({body: resetPasswordDto}), auth.resetPassword);
routes.post('/auth/mfa', validate({body: verifyMfaDto}), auth.verifyMfa);
routes.post('/auth/mfa/email', validate({body: mfaTokenDto}), auth.sendLoginCode);
routes.post('/auth/passkey/options', security.passkeyLoginOptions);
routes.post('/auth/passkey', validate({body: passkeyLoginDto}), security.passkeyLogin);

routes.use(authenticate);

routes.patch('/me', validate({body: updateProfileDto}), auth.updateProfile);
routes.patch('/me/password', validate({body: changePasswordDto}), auth.changePassword);
routes.delete('/me/sessions', auth.logoutEverywhere);

routes.get('/me/security', security.summary);
routes.patch('/me/security', validate({body: updateSecurityDto}), security.updateSecurity);
routes.post('/me/email/code', security.sendEmailCode);
routes.post('/me/email/verify', validate({body: codeDto}), security.verifyEmail);
routes.post('/me/phone/code', security.sendPhoneCode);
routes.post('/me/phone/verify', validate({body: codeDto}), security.verifyPhone);
routes.post('/me/totp/setup', security.startTotp);
routes.post('/me/totp', validate({body: codeDto}), security.confirmTotp);
routes.delete('/me/totp', validate({body: codeDto}), security.removeTotp);
routes.post('/me/passkeys/options', validate({body: passkeyOptionsDto}), security.passkeyRegistrationOptions);
routes.post('/me/passkeys', validate({body: addPasskeyDto}), security.addPasskey);
routes.patch('/me/passkeys/:credentialId', validate({params: passkeyParams, body: renamePasskeyDto}), security.renamePasskey);
routes.delete('/me/passkeys/:credentialId', validate({params: passkeyParams}), security.deletePasskey);

routes.get('/doctors', users.listDoctors);
routes.get('/doctors/:id', validate({params: idParams}), users.getDoctor);
routes.post('/doctors', requireRole('admin'), validate({body: createDoctorDto}), users.createDoctor);
routes.patch('/doctors/:id', requireRole('admin'), validate({params: idParams, body: updateDoctorDto}), users.updateDoctor);
routes.delete('/doctors/:id', requireRole('admin'), validate({params: idParams}), users.deleteDoctor);
routes.get('/patients', requireRole('admin'), users.listPatients);
