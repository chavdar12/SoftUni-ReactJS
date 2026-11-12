import {Schema, model} from 'mongoose';
import {toJSON} from '#shared/models/json.ts';
import {ROLES} from '#shared/lib/jwt.ts';

export const SPECIALIZATIONS = ['General', 'Cardiologist', 'Gynaecologist', 'Dermatologist', 'Pediatrician', 'Neurologist'];

const passkeySchema = new Schema(
    {
        credentialId: {type: String, required: true}, // base64url
        publicKey: {type: String, required: true}, // base64url COSE key
        counter: {type: Number, default: 0},
        transports: [String],
        name: {type: String, required: true},
        createdAt: {type: Date, default: Date.now},
        lastUsedAt: Date,
    },
    {_id: false},
);

const userSchema = new Schema(
    {
        name: {type: String, required: true, trim: true},
        email: {type: String, required: true, unique: true, lowercase: true, trim: true},
        emailVerified: {type: Boolean, default: false},
        passwordHash: {type: String, required: true},
        role: {type: String, enum: ROLES, required: true, index: true},
        phone: String, // E.164, e.g. +359888123456 (older accounts may hold free text)
        phoneVerified: {type: Boolean, default: false},
        specialization: {type: String, enum: SPECIALIZATIONS},
        roomNumber: Number,
        // Doctors only; unset means DEFAULT_HOURS.
        workingHours: {
            type: new Schema({days: [Number], start: String, end: String}, {_id: false}),
            default: undefined,
        },
        // Removed doctors are deactivated, not deleted, so their account can't be re-registered or reused.
        active: {type: Boolean, default: true},
        // Two-step sign-in. One authenticator app per account; its secret is sealed (lib/secretBox).
        totp: {type: new Schema({secret: String, enabledAt: Date}, {_id: false}), default: undefined},
        emailCodeLogin: {type: Boolean, default: false},
        passkeys: {type: [passkeySchema], default: []},
    },
    {
        // Security details never leave through toJSON (doctor lists, sessions); GET /me/security has them.
        toJSON: {
            ...toJSON,
            transform: (doc: unknown, ret: Record<string, unknown>) => {
                toJSON.transform(doc, ret);
                for (const k of ['totp', 'passkeys', 'emailCodeLogin', 'emailVerified', 'phoneVerified']) delete ret[k];
                return ret;
            },
        },
    },
);

userSchema.index({'passkeys.credentialId': 1}, {unique: true, partialFilterExpression: {'passkeys.credentialId': {$exists: true}}});

export const User = model('User', userSchema);
