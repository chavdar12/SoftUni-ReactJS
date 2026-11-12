import type {Request, Response} from 'express';
import * as records from '#appointments/services/records.service.ts';
import type {AddNoteDto} from '#appointments/dto/record.dto.ts';

export async function history(req: Request, res: Response) {
    res.json(await records.history(req.user, String(req.params.patientId)));
}

export async function addNote(req: Request, res: Response) {
    res.status(201).json(await records.addNote(req.user, req.body as AddNoteDto));
}
