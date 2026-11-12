import {test} from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {errorHandler} from './errors.ts';
import {HttpError} from '#shared/lib/HttpError.ts';

function run(err: unknown) {
    const res: any = {locals: {}, status(s: number) { this.statusCode = s; return this; }, json(b: unknown) { this.body = b; return this; }};
    errorHandler(err, {} as any, res, () => {});
    return res as {statusCode: number; body: {error: string}};
}

test('maps duplicate keys to 409 with a message per index', () => {
    assert.deepEqual(run({code: 11000, keyPattern: {email: 1}}).body, {error: 'Email already registered'});
    const slot = run({code: 11000, keyPattern: {doctorId: 1, date: 1}});
    assert.equal(slot.statusCode, 409);
    assert.equal(slot.body.error, 'Already exists');
});

test('zod errors are 400, HttpErrors keep status, bugs are hidden 500s', () => {
    const zodErr = z.object({a: z.string()}).safeParse({}).error;
    assert.equal(run(zodErr).statusCode, 400);
    assert.deepEqual(run(new HttpError(404, 'Nope')).body, {error: 'Nope'});
    const write = process.stderr.write;
    process.stderr.write = (() => true) as any; // silence the logged 500
    try {
        assert.deepEqual(run(new Error('secret detail')).body, {error: 'Internal server error'});
    } finally {
        process.stderr.write = write;
    }
});
