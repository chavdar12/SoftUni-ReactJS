import {TZDate} from '@date-fns/tz';
import {addHours, format} from 'date-fns';
import {appointmentRepository} from '#appointments/repositories/appointment.repository.ts';
import {sendMail} from '#shared/lib/mailer.ts';
import {logger} from '#shared/lib/logger.ts';
import {config} from '#appointments/config.ts';


/**
 * Emails every active appointment starting within 24h, once. Each one is claimed with an atomic
 * update before sending, so any number of pods can run this without sending twice.
 */
export async function sendDueReminders(now = new Date()) {
    for (;;) {
        const a = await appointmentRepository.claimDueReminder(now, addHours(now, 24));
        if (!a) return;
        if (!a.patientEmail) continue;
        const when = format(new TZDate(a.date, config.clinicTz), "EEEE d MMMM yyyy 'at' HH:mm");
        await sendMail({
            to: a.patientEmail,
            subject: 'Appointment reminder',
            text: `Hi ${a.patientName}, this is a reminder of your appointment with ${a.doctorName} (room ${a.roomNumber}) on ${when}.`,
        });
    }
}

export function startReminders() {
    setInterval(() => sendDueReminders().catch((err) => logger.error('reminders failed', {err})), 60_000).unref();
}
