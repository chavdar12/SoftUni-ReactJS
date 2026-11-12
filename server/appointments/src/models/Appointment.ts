import {Schema, model} from 'mongoose';
import {toJSON} from '#shared/models/json.ts';

// Names are copied in at booking so history stays readable after a doctor is deleted.
// The prescription lives on the appointment so "prescribe + close" is one atomic write.
const appointmentSchema = new Schema(
    {
        patientId: {type: Schema.Types.ObjectId, required: true, index: true},
        patientName: {type: String, required: true},
        patientEmail: String, // for reminders
        doctorId: {type: Schema.Types.ObjectId, required: true, index: true},
        doctorName: {type: String, required: true},
        specialization: String,
        roomNumber: Number,
        date: {type: Date, required: true},
        reason: String,
        status: {type: String, enum: ['active', 'cancelled', 'done'], default: 'active', index: true},
        closedBy: String,
        cancelReason: String,
        reminderSentAt: Date,
        prescription: {
            type: new Schema({disease: String, medication: String}, {_id: false}),
            default: undefined,
        },
        rating: {type: Number, min: 1, max: 5},
        refillStatus: {type: String, enum: ['requested', 'approved', 'denied']},
        refillOf: Schema.Types.ObjectId, // set on the entry an approved refill creates
    },
    {toJSON, timestamps: true},
);

// One active booking per doctor per slot; enforced by Mongo, so two pods racing can't double-book.
appointmentSchema.index({doctorId: 1, date: 1}, {unique: true, partialFilterExpression: {status: 'active'}});
// The reminder job's scan.
appointmentSchema.index({status: 1, date: 1});

export const Appointment = model('Appointment', appointmentSchema);
