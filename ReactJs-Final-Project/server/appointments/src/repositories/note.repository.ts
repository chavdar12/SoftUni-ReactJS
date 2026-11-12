import {Note} from '#appointments/models/Note.ts';

export type NoteDoc = InstanceType<typeof Note>;

export const noteRepository = {
    create: (data: {patientId: string; doctorId: string; doctorName: string; text: string}) => Note.create(data),
    listForPatient: (patientId: string) => Note.find({patientId}).sort('-createdAt'),
};
