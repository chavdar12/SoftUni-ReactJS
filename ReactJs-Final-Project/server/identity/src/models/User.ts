import {Schema, model} from 'mongoose';
import {toJSON} from '../../../shared/src/models/json.ts';
import {ROLES} from '../../../shared/src/lib/jwt.ts';

export const SPECIALIZATIONS = ['General', 'Cardiologist', 'Gynaecologist', 'Dermatologist', 'Pediatrician', 'Neurologist'];

const userSchema = new Schema(
    {
        name: {type: String, required: true, trim: true},
        email: {type: String, required: true, unique: true, lowercase: true, trim: true},
        passwordHash: {type: String, required: true},
        role: {type: String, enum: ROLES, required: true, index: true},
        phone: String,
        specialization: {type: String, enum: SPECIALIZATIONS},
        roomNumber: Number,
    },
    {toJSON},
);

export const User = model('User', userSchema);
