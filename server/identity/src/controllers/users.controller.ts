import type {Request, Response} from 'express';
import * as users from '#identity/services/users.service.ts';
import type {CreateDoctorDto, UpdateDoctorDto} from '#identity/dto/user.dto.ts';

const id = (req: Request) => String(req.params.id);

export async function listDoctors(_req: Request, res: Response) {
    const {doctors, cached} = await users.listDoctors();
    res.set('X-Cache', cached ? 'HIT' : 'MISS').json(doctors);
}

export async function createDoctor(req: Request, res: Response) {
    res.status(201).json(await users.createDoctor(req.body as CreateDoctorDto));
}

export async function getDoctor(req: Request, res: Response) {
    res.json(await users.getDoctor(id(req)));
}

export async function updateDoctor(req: Request, res: Response) {
    res.json(await users.updateDoctor(id(req), req.body as UpdateDoctorDto));
}

export async function deleteDoctor(req: Request, res: Response) {
    await users.deactivateDoctor(id(req));
    res.status(204).end();
}

export async function listPatients(_req: Request, res: Response) {
    res.json(await users.listPatients());
}
