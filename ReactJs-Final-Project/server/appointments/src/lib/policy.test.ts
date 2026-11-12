import {test} from 'node:test';
import assert from 'node:assert/strict';
import {escapeRegex, ownedBy, shouldNotify, tooLateToChange} from './policy.ts';

const now = new Date('2030-01-15T10:00:00Z');

test('patients can change appointments only up to 2 hours ahead', () => {
    assert.equal(tooLateToChange(new Date('2030-01-15T12:00:00Z'), now), false);
    assert.equal(tooLateToChange(new Date('2030-01-15T11:59:00Z'), now), true);
    assert.equal(tooLateToChange(new Date('2030-01-15T09:00:00Z'), now), true);
});

test('ownership filter per role', () => {
    assert.deepEqual(ownedBy({id: 'a', role: 'admin', name: ''}), {});
    assert.deepEqual(ownedBy({id: 'd', role: 'doctor', name: ''}), {doctorId: 'd'});
    assert.deepEqual(ownedBy({id: 'p', role: 'patient', name: ''}), {patientId: 'p'});
});

test('live updates reach the patient, the doctor and admins only', () => {
    const change = {patientId: 'p', doctorId: 'd'};
    assert.ok(shouldNotify({id: 'p', role: 'patient', name: ''}, change));
    assert.ok(shouldNotify({id: 'd', role: 'doctor', name: ''}, change));
    assert.ok(shouldNotify({id: 'x', role: 'admin', name: ''}, change));
    assert.equal(shouldNotify({id: 'p2', role: 'patient', name: ''}, change), false);
    assert.equal(shouldNotify({id: 'd2', role: 'doctor', name: ''}, change), false);
});

test('search text is matched literally', () => {
    assert.ok(new RegExp(escapeRegex('Dr. (A)+')).test('Dr. (A)+'));
    assert.equal(new RegExp(escapeRegex('a.c')).test('abc'), false);
});
