import {Schema, model} from 'mongoose';
import {toJSON} from '#shared/models/json.ts';

/** A doctor's note in a patient's medical history. */
const noteSchema = new Schema(
    {
        patientId: {type: Schema.Types.ObjectId, required: true, index: true},
        doctorId: {type: Schema.Types.ObjectId, required: true},
        doctorName: {type: String, required: true},
        text: {type: String, required: true},
    },
    {toJSON, timestamps: true},
);

export const Note = model('Note', noteSchema);
