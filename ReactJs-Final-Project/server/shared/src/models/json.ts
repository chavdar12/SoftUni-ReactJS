/** Shared toJSON: expose `id` instead of `_id`, never send password hashes. */
export const toJSON = {
    virtuals: true,
    versionKey: false,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.passwordHash;
        return ret;
    },
};
