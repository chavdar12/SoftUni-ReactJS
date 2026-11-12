import {Appointment} from '#appointments/models/Appointment.ts';
import {escapeRegex} from '#appointments/lib/policy.ts';
import type {Status} from '#appointments/dto/appointment.dto.ts';

/** The only place the appointments service talks to Mongo about appointments. */
export type AppointmentDoc = InstanceType<typeof Appointment>;

/** Who may see what: {} (admin), {doctorId} or {patientId}; see policy.ownedBy. */
export type Owner = {doctorId?: string; patientId?: string};

export interface ListCriteria {
    owner: Owner;
    status?: Status;
    from?: Date;
    to?: Date;
    q?: string;
}

const after = {returnDocument: 'after'} as const;
const SEARCH_FIELDS = ['patientName', 'doctorName', 'specialization', 'reason', 'prescription.disease'];

function toFilter({owner, status, from, to, q}: ListCriteria) {
    const filter: Record<string, unknown> = {...owner};
    if (status) filter.status = status;
    if (from || to) filter.date = {...(from && {$gte: from}), ...(to && {$lt: to})};
    if (q) {
        const re = new RegExp(escapeRegex(q), 'i');
        filter.$or = SEARCH_FIELDS.map((f) => ({[f]: re}));
    }
    return filter;
}

export const appointmentRepository = {
    /** One page, newest first, plus the total matching. */
    async page(criteria: ListCriteria, page: number, limit: number) {
        const filter = toFilter(criteria);
        const [rows, total] = await Promise.all([
            Appointment.find(filter).sort('-date').skip(page * limit).limit(limit),
            Appointment.countDocuments(filter),
        ]);
        return {rows, total};
    },

    /** Throws Mongo's duplicate-key error (11000) when the doctor's slot is already actively booked. */
    create: (data: Record<string, unknown>) => Appointment.create(data),

    findActive: (id: string, owner: Owner) => Appointment.findOne({_id: id, status: 'active', ...owner}),

    /** Start times among `slots` the doctor already has an active booking for. */
    async takenSlots(doctorId: string, slots: Date[]) {
        const taken: Date[] = await Appointment.find({doctorId, status: 'active', date: {$in: slots}}).distinct('date');
        return new Set(taken.map((d) => d.getTime()));
    },

    // Each update re-checks status: 'active' itself, so a concurrent close can't be overwritten.
    cancel: (id: string, closedBy: string, cancelReason?: string) =>
        Appointment.findOneAndUpdate({_id: id, status: 'active'}, {status: 'cancelled', closedBy, cancelReason}, after),

    /** Throws 11000 when the new slot is taken. Clears the reminder so the new time gets one. */
    reschedule: (id: string, date: Date) =>
        Appointment.findOneAndUpdate({_id: id, status: 'active'}, {date, $unset: {reminderSentAt: 1}}, after),

    prescribe: (id: string, doctorId: string, closedBy: string, prescription: {disease: string; medication: string}) =>
        Appointment.findOneAndUpdate({_id: id, status: 'active', doctorId}, {status: 'done', closedBy, prescription}, after),

    /** Only finished, unrated appointments of this patient. */
    rate: (id: string, patientId: string, rating: number) =>
        Appointment.findOneAndUpdate({_id: id, patientId, status: 'done', rating: null}, {rating}, after),

    async averageRatings() {
        const rows = await Appointment.aggregate([
            {$match: {rating: {$ne: null}}},
            {$group: {_id: '$doctorId', average: {$avg: '$rating'}, count: {$sum: 1}}},
        ]);
        return rows.map((r) => ({doctorId: String(r._id), average: r.average as number, count: r.count as number}));
    },

    /** Not while one is pending or after one was approved. */
    requestRefill: (id: string, patientId: string) =>
        Appointment.findOneAndUpdate(
            {_id: id, patientId, status: 'done', refillStatus: {$nin: ['requested', 'approved']}},
            {refillStatus: 'requested'},
            after,
        ),

    decideRefill: (id: string, doctorId: string, approve: boolean) =>
        Appointment.findOneAndUpdate(
            {_id: id, doctorId, refillStatus: 'requested'},
            {refillStatus: approve ? 'approved' : 'denied'},
            after,
        ),

    reopenRefill: (id: unknown) => Appointment.updateOne({_id: id}, {refillStatus: 'requested'}),

    async stats() {
        const [result] = await Appointment.aggregate([
            {
                $facet: {
                    byStatus: [{$group: {_id: '$status', count: {$sum: 1}}}],
                    byDoctor: [
                        {$group: {_id: '$doctorId', doctorName: {$last: '$doctorName'}, count: {$sum: 1}}},
                        {$sort: {count: -1}},
                        {$limit: 10},
                    ],
                },
            },
        ]);
        return result as {
            byStatus: {_id: Status; count: number}[];
            byDoctor: {_id: unknown; doctorName: string; count: number}[];
        };
    },

    listForPatient: (patientId: string) => Appointment.find({patientId}).sort('-date'),
    hasSeen: async (patientId: string, doctorId: string) => !!(await Appointment.exists({patientId, doctorId})),

    /** Atomically marks one due, un-reminded appointment as reminded and returns it (safe across pods). */
    claimDueReminder: (now: Date, until: Date) =>
        Appointment.findOneAndUpdate(
            {status: 'active', reminderSentAt: null, date: {$gt: now, $lte: until}},
            {reminderSentAt: now},
        ),
};
