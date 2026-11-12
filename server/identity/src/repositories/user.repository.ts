import {User} from '#identity/models/User.ts';

/** The only place the identity service talks to Mongo about users. */
export type UserDoc = InstanceType<typeof User>;

const active = {active: {$ne: false}} as const;
const activeDoctor = (id: string) => ({_id: id, role: 'doctor', ...active}) as const;
const after = {returnDocument: 'after', runValidators: true} as const;

export const userRepository = {
    create: (data: Record<string, unknown>) => User.create(data),
    save: (user: UserDoc) => user.save(),

    findById: (id: string) => User.findById(id),
    findActiveById: (id: string) => User.findOne({_id: id, ...active}),
    findActiveByEmail: (email: string) => User.findOne({email: email.toLowerCase(), ...active}),
    findActiveByPasskey: (credentialId: string) => User.findOne({'passkeys.credentialId': credentialId, ...active}),

    listActiveDoctors: () => User.find({role: 'doctor', ...active}).sort('name'),
    listPatients: () => User.find({role: 'patient'}).sort('name'),
    findActiveDoctor: (id: string) => User.findOne(activeDoctor(id)),
    updateActiveDoctor: (id: string, changes: Record<string, unknown>) => User.findOneAndUpdate(activeDoctor(id), changes, after),
    deactivateDoctor: (id: string) => User.findOneAndUpdate(activeDoctor(id), {active: false}),

    /** Creates the account only if the email is free. True when it was created. */
    async insertIfAbsent(email: string, data: Record<string, unknown>) {
        const {upsertedCount} = await User.updateOne({email}, {$setOnInsert: data}, {upsert: true});
        return upsertedCount > 0;
    },

    /** Sets the authenticator only if none is set, so two racing setups can't both win. */
    async setTotpIfNone(userId: string, sealedSecret: string) {
        const r = await User.updateOne({_id: userId, totp: null}, {totp: {secret: sealedSecret, enabledAt: new Date()}});
        return r.modifiedCount > 0;
    },

    async renamePasskey(userId: string, credentialId: string, name: string) {
        const r = await User.updateOne({_id: userId, 'passkeys.credentialId': credentialId}, {'passkeys.$.name': name});
        return r.matchedCount > 0;
    },

    async removePasskey(userId: string, credentialId: string) {
        const r = await User.updateOne({_id: userId}, {$pull: {passkeys: {credentialId}}});
        return r.modifiedCount > 0;
    },

    recordPasskeyUse: (userId: string, credentialId: string, counter: number) =>
        User.updateOne(
            {_id: userId, 'passkeys.credentialId': credentialId},
            {'passkeys.$.counter': counter, 'passkeys.$.lastUsedAt': new Date()},
        ),
};
