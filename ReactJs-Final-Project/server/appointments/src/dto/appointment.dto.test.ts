import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bookDto as bookBody, listQueryDto as listQuery, rateDto as rateBody} from './appointment.dto.ts';

const doctorId = 'a'.repeat(24);

test('booking needs a future date on a 30-minute slot', () => {
    assert.ok(bookBody.safeParse({doctorId, date: '2099-01-01T10:30:00.000Z'}).success);
    assert.ok(bookBody.safeParse({doctorId, date: '2099-01-01T10:30:00Z', reason: 'Headache'}).success);
    assert.equal(bookBody.safeParse({doctorId, date: '2001-01-01T10:30:00.000Z'}).success, false);
    assert.equal(bookBody.safeParse({doctorId, date: '2099-01-01T10:15:00.000Z'}).success, false);
    assert.equal(bookBody.safeParse({doctorId, date: '2099-01-01T10:30:05.000Z'}).success, false);
    assert.equal(bookBody.safeParse({doctorId, date: '2099-01-01T10:30:00Z', reason: 'x'.repeat(501)}).success, false);
});

test('list query defaults and caps', () => {
    assert.deepEqual(listQuery.parse({}), {page: 0, limit: 50});
    assert.deepEqual(listQuery.parse({page: '2', limit: '10', q: ' ana '}), {page: 2, limit: 10, q: 'ana'});
    assert.equal(listQuery.safeParse({limit: '5000'}).success, false);
    assert.equal(listQuery.safeParse({status: 'lost'}).success, false);
});

test('ratings are whole stars 1 to 5', () => {
    assert.ok(rateBody.safeParse({stars: 5}).success);
    for (const stars of [0, 6, 3.5, '4']) assert.equal(rateBody.safeParse({stars}).success, false);
});
