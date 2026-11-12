import type {NextFunction, Request, Response} from 'express';
import type {ZodType} from 'zod';

/** Parses body/params/query with zod (400 on failure) and replaces them with the cleaned values. */
export const validate =
    (schemas: {body?: ZodType; params?: ZodType; query?: ZodType}) => (req: Request, _res: Response, next: NextFunction) => {
        if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
        if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
        // Express 5 makes req.query a getter, so it is redefined rather than assigned.
        if (schemas.query) Object.defineProperty(req, 'query', {value: schemas.query.parse(req.query), writable: true});
        next();
    };
