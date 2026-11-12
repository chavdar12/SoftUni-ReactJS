import nodemailer from 'nodemailer';
import {logger} from './logger.ts';

export interface Mail {
    to: string;
    subject: string;
    text: string;
}

// SMTP_URL e.g. smtp://maildev:1025 (MailDev catches everything for testing). Unset: mail is only logged.
const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;
const from = process.env.MAIL_FROM ?? 'HMS <no-reply@hms.local>';

export async function sendMail(mail: Mail) {
    if (!transport) {
        logger.info('mail (SMTP_URL not set, not sent)', {to: mail.to, subject: mail.subject});
        return;
    }
    await transport.sendMail({from, ...mail});
    logger.info('mail sent', {to: mail.to, subject: mail.subject});
}

// shortcut: "SMS" is an email to <digits>@sms.mock so it shows up in MailDev; plug in an SMS provider for real phones.
export const sendSms = (phone: string, text: string) =>
    sendMail({to: `${phone.replace(/\D/g, '')}@sms.mock`, subject: `SMS to ${phone}`, text});
