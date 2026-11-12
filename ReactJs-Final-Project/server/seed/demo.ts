// Fills both service databases with demo doctors, patients, appointments, prescriptions, ratings,
// a refill request and notes. Safe to re-run: it stops if the demo data is already there.
//   npm run seed                      (MONGO_URL defaults to mongodb://localhost:27017)
import mongoose from 'mongoose';
import {Redis} from 'ioredis';
import bcrypt from 'bcryptjs';
import {addDays, format, startOfToday, subDays} from 'date-fns';
import {User as UserModel} from '#identity/models/User.ts';
import {Appointment as AppointmentModel} from '#appointments/models/Appointment.ts';
import {Note as NoteModel} from '#appointments/models/Note.ts';
import {daySlots} from '#appointments/lib/slots.ts';
import {DEFAULT_HOURS, type WorkingHours} from '#shared/lib/hours.ts';

const TZ = process.env.CLINIC_TZ ?? 'Europe/Sofia';
const conn = await mongoose.createConnection(process.env.MONGO_URL ?? 'mongodb://localhost:27017').asPromise();
const User = conn.useDb('hms_identity').model('User', UserModel.schema);
const Appointment = conn.useDb('hms_appointments').model('Appointment', AppointmentModel.schema);
const Note = conn.useDb('hms_appointments').model('Note', NoteModel.schema);
await Appointment.syncIndexes(); // the one-active-booking-per-slot index guards the inserts below

if (await User.exists({email: 'maria.ivanova@hms.local'})) {
    console.log('Demo data already present, nothing to do.');
    await conn.close();
    process.exit(0);
}

const doctorHash = await bcrypt.hash('doctor123', 10);
const patientHash = await bcrypt.hash('patient123', 10);
const saturdays: WorkingHours = {days: [1, 2, 3, 4, 5, 6], start: '08:00', end: '14:00'};

const doctors = await User.insertMany(
    [
        ['Dr Maria Ivanova', 'maria.ivanova', 'General', 101, DEFAULT_HOURS],
        ['Dr Georgi Petrov', 'georgi.petrov', 'Cardiologist', 102, DEFAULT_HOURS],
        ['Dr Elena Dimitrova', 'elena.dimitrova', 'Gynaecologist', 103, DEFAULT_HOURS],
        ['Dr Nikolay Stoyanov', 'nikolay.stoyanov', 'Dermatologist', 104, saturdays],
        ['Dr Ivana Koleva', 'ivana.koleva', 'Pediatrician', 105, DEFAULT_HOURS],
        ['Dr Petar Angelov', 'petar.angelov', 'Neurologist', 106, {days: [1, 3, 5], start: '10:00', end: '18:00'}],
    ].map(([name, user, specialization, roomNumber, workingHours]) => ({
        name, specialization, roomNumber, workingHours,
        email: `${user}@hms.local`, passwordHash: doctorHash, role: 'doctor',
    })),
);

const patients = await User.insertMany(
    ['Ana Georgieva', 'Boris Nikolov', 'Viktoria Hristova', 'Dimitar Todorov', 'Gergana Pavlova', 'Kalin Marinov', 'Lilia Yordanova', 'Stefan Iliev']
        .map((name, i) => ({
            name,
            email: `${name.split(' ')[0].toLowerCase()}@example.com`,
            phone: `+35988810${String(i).padStart(2, '0')}00`,
            phoneVerified: i % 2 === 0,
            emailVerified: true,
            passwordHash: patientHash,
            role: 'patient',
        })),
);

const diagnoses = [
    ['Seasonal flu', 'Paracetamol 500 mg, 3x daily for 5 days; rest and fluids'],
    ['Hypertension', 'Amlodipine 5 mg, once daily; re-check in 4 weeks'],
    ['Contact dermatitis', 'Hydrocortisone 1% cream, twice daily for 7 days'],
    ['Migraine', 'Ibuprofen 400 mg at onset; avoid screens in the evening'],
    ['Sinusitis', 'Amoxicillin 500 mg, 3x daily for 7 days'],
    ['Vitamin D deficiency', 'Vitamin D3 2000 IU, once daily for 3 months'],
];
const reasons = ['Check-up', 'Headache for a week', 'Skin rash', 'Chest pain when climbing stairs', 'Follow-up visit', undefined];

/** The `n`-th working slot of `doctor` on the `offset`-th working day from today (negative = past). */
function slot(doctor: (typeof doctors)[number], offset: number, n: number) {
    const hours = (doctor.workingHours ?? DEFAULT_HOURS) as WorkingHours;
    const step = offset < 0 ? -1 : 1;
    let day = startOfToday();
    for (let found = 0; ; ) {
        day = addDays(day, step);
        const slots = daySlots(format(day, 'yyyy-MM-dd'), hours, TZ);
        if (slots.length && ++found === Math.abs(offset)) return slots[n % slots.length];
    }
}

const base = (d: (typeof doctors)[number], p: (typeof patients)[number]) => ({
    patientId: p._id, patientName: p.name, patientEmail: p.email,
    doctorId: d._id, doctorName: d.name, specialization: d.specialization, roomNumber: d.roomNumber,
});

const appointments = [];
let k = 0;
for (const [di, d] of doctors.entries()) {
    for (let j = 0; j < 4; j++, k++) {
        const p = patients[(di + j * 3) % patients.length];
        // Past: done with a prescription (most rated), or cancelled.
        if (j < 3) {
            const [disease, medication] = diagnoses[(di + j) % diagnoses.length];
            appointments.push({
                ...base(d, p), date: slot(d, -(j + 1), k), reason: reasons[k % reasons.length],
                status: 'done', closedBy: d.name, prescription: {disease, medication},
                rating: j < 2 ? 3 + ((di + j) % 3) : undefined,
                refillStatus: di === 1 && j === 0 ? 'requested' : undefined,
            });
        } else {
            appointments.push({
                ...base(d, p), date: slot(d, -2, k + 5), reason: reasons[k % reasons.length],
                status: 'cancelled', closedBy: p.name, cancelReason: 'Could not make it',
            });
        }
        // Upcoming: active, in the next two weeks.
        appointments.push({...base(d, p), date: slot(d, 1 + ((j * 2 + di) % 8), k + 2), reason: reasons[(k + 1) % reasons.length]});
    }
}
await Appointment.insertMany(appointments);

await Note.insertMany([
    {patientId: patients[0]._id, doctorId: doctors[0]._id, doctorName: doctors[0].name, text: 'Allergic to penicillin.'},
    {patientId: patients[1]._id, doctorId: doctors[1]._id, doctorName: doctors[1].name, text: 'BP 150/95 at first visit. Advised low-salt diet.'},
    {patientId: patients[3]._id, doctorId: doctors[5]._id, doctorName: doctors[5].name, text: 'Migraines worse with poor sleep; keep a headache diary.'},
]);

console.log(`Seeded ${doctors.length} doctors (password doctor123), ${patients.length} patients (password patient123), ` +
    `${appointments.length} appointments, 3 notes.\nTry: maria.ivanova@hms.local / ana@example.com`);
await conn.close();

// We wrote past the identity service, so drop its doctors-list cache (key from identity users.service) or
// new doctors stay hidden for up to 5 min. Best-effort: no Redis just means waiting out the TTL.
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {lazyConnect: true, maxRetriesPerRequest: 0, retryStrategy: () => null});
redis.on('error', () => {}); // the catch below reports it
await redis.connect().then(() => redis.del('cache:doctors')).catch(() => console.warn('Redis unreachable: doctors list refreshes within 5 min.'));
redis.disconnect();
