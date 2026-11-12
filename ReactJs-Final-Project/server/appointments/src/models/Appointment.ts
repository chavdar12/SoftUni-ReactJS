import {Schema, model} from 'mongoose';
import {toJSON} from '../../../shared/src/models/json.ts';

// Names are copied in at booking so history stays readable after a doctor is deleted.
// The prescription lives on the appointment so "prescribe + close" is one atomic write.
const appointmentSchema = new Schema(
    {
        patientId: {type: Schema.Types.ObjectId, required: true, index: true},
        patientName: {type: String, required: true},
        doctorId: {type: Schema.Types.ObjectId, required: true, index: true},
        doctorName: {type: String, required: true},
        specialization: String,
        roomNumber: Number,
        date: {type: Date, required: true},
        status: {type: String, enum: ['active', 'cancelled', 'done'], default: 'active', index: true},
        closedBy: String,
        prescription: {
            type: new Schema({disease: String, medication: String}, {_id: false}),
            default: undefined,
        },
    },
    {toJSON, timestamps: true},
);

export const Appointment = model('Appointment', appointmentSchema);
