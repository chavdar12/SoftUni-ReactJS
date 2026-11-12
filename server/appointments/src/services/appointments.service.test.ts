import {mock, test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import type {AuthUser} from '#shared/lib/jwt.ts';

// Fake repository + identity client + events: the service's rules run without Mongo, Redis or HTTP.
const repo = {
    create: mock.fn(async (data: any) => doc(data)),
    findActive: mock.fn(async (): Promise<any> => null),
    cancel: mock.fn(async (id: string, closedBy: string, cancelReason?: string) => doc({id, status: 'cancelled', closedBy, cancelReason})),
    decideRefill: mock.fn(async (): Promise<any> => null),
    reopenRefill: mock.fn(async () => {}),
    page: mock.fn(async () => ({rows: [doc({})], total: 1})),
};
const published = mock.fn();
const doctor = {id: 'd1', name: 'Dr Who', specialization: 'General', roomNumber: 7}; // default hours: Mon-Fri 09-17
const url = (p: string) => new URL(p, import.meta.url).href;
mock.module(import.meta.resolve('#appointments/repositories/appointment.repository.ts'), {exports: {appointmentRepository: repo}});
mock.module(import.meta.resolve('#appointments/lib/identityClient.ts'), {exports: {getDoctor: async () => doctor}});
mock.module(import.meta.resolve('#appointments/lib/events.ts'), {exports: {publishChange: published}});
const service = await import('./appointments.service.ts');

function doc(fields: Record<string, unknown>) {
    return {id: 'a1', _id: 'a1', patientId: 'p1', patientName: 'Ana', doctorId: 'd1', doctorName: 'Dr Who', date: new Date('2099-01-05T08:00:00Z'), status: 'active', ...fields};
}
const patient: AuthUser = {id: 'p1', role: 'patient', name: 'Ana', email: 'ana@x.co'};
const doc2: AuthUser = {id: 'd1', role: 'doctor', name: 'Dr Who'};
const caller = {authorization: 'Bearer t', reqId: 'r1'};
const MONDAY_10_SOFIA = '2099-01-05T08:00:00.000Z';
const SATURDAY_10_SOFIA = '2099-01-10T08:00:00.000Z';

beforeEach(() => {
    for (const fn of [...Object.values(repo), published]) fn.mock.resetCalls();
});

test('book copies doctor and patient details, then publishes the change', async () => {
    const dto = await service.book(patient, caller, {doctorId: 'd1', date: MONDAY_10_SOFIA, reason: ''});
    const saved = repo.create.mock.calls[0].arguments[0];
    assert.deepEqual(
        {patientEmail: saved.patientEmail, doctorName: saved.doctorName, roomNumber: saved.roomNumber, reason: saved.reason},
        {patientEmail: 'ana@x.co', doctorName: 'Dr Who', roomNumber: 7, reason: undefined},
    );
    assert.equal(published.mock.callCount(), 1);
    assert.equal(dto.id, 'a1');
    assert.ok(!('patientEmail' in dto)); // not part of the output DTO
});

test('book refuses times outside the doctor’s hours without touching the database', async () => {
    await assert.rejects(service.book(patient, caller, {doctorId: 'd1', date: SATURDAY_10_SOFIA}), {status: 400});
    assert.equal(repo.create.mock.callCount(), 0);
});

test('a slot taken by someone else is a 409', async () => {
    repo.create.mock.mockImplementationOnce(async () => {
        throw Object.assign(new Error('E11000'), {code: 11000});
    });
    await assert.rejects(service.book(patient, caller, {doctorId: 'd1', date: MONDAY_10_SOFIA}), {status: 409, message: 'That time slot is already taken'});
    assert.equal(published.mock.callCount(), 0);
});

test('patients can’t cancel inside 2 hours; doctors can', async () => {
    const soon = doc({date: new Date(Date.now() + 30 * 60_000)});
    repo.findActive.mock.mockImplementation(async () => soon);
    await assert.rejects(service.cancel(patient, 'a1', {}), {status: 409});
    assert.equal(repo.cancel.mock.callCount(), 0);

    const dto = await service.cancel(doc2, 'a1', {reason: 'Sick'});
    assert.deepEqual(repo.cancel.mock.calls[0].arguments, ['a1', 'Dr Who', 'Sick']);
    assert.equal(dto.cancelReason, 'Sick');
    repo.findActive.mock.mockImplementation(async () => null);
});

test('cancelling something that isn’t yours (or isn’t active) is a 404', async () => {
    await assert.rejects(service.cancel(patient, 'a1', {}), {status: 404});
    assert.deepEqual(repo.findActive.mock.calls[0].arguments, ['a1', {patientId: 'p1'}]);
});

test('an approved refill creates a finished copy; if that fails the request is reopened', async () => {
    const original = doc({status: 'done', prescription: {disease: 'Flu', medication: 'Rest'}, refillStatus: 'approved'});
    repo.decideRefill.mock.mockImplementation(async () => original);

    await service.decideRefill(doc2, 'a1', true);
    const copy = repo.create.mock.calls[0].arguments[0];
    assert.deepEqual([copy.status, copy.refillOf, copy.prescription.disease], ['done', 'a1', 'Flu']);

    repo.create.mock.mockImplementationOnce(async () => {
        throw new Error('db down');
    });
    await assert.rejects(service.decideRefill(doc2, 'a1', true), /db down/);
    assert.equal(repo.reopenRefill.mock.callCount(), 1);
});

test('list scopes to the caller and maps rows to DTOs', async () => {
    const page = await service.list(patient, {page: 0, limit: 10, q: 'flu'});
    const [criteria, pageNo, limit] = repo.page.mock.calls[0].arguments as any[];
    assert.deepEqual([criteria.owner, criteria.q, pageNo, limit], [{patientId: 'p1'}, 'flu', 0, 10]);
    assert.equal(page.total, 1);
    assert.equal(page.items[0].patientId, 'p1');
});
