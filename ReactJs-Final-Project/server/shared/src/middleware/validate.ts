import type {NextFunction, Request, Response} from 'express';
import type {ZodType} from 'zod';

/** Parses body/params with zod (400 on failure) and replaces them with the cleaned values. */
export const validate =
    (schemas: {body?: ZodType; params?: ZodType}) => (req: Request, _res: Response, next: NextFunction) => {
        if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
        if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
        next();
    };
