import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workingHoursSchema} from './hours.ts';

test('accepts half-hour working hours', () => {
    assert.ok(workingHoursSchema.safeParse({days: [1, 2], start: '08:30', end: '16:00'}).success);
});

test('rejects bad hours', () => {
    for (const bad of [
        {days: [], start: '09:00', end: '17:00'},
        {days: [1, 1], start: '09:00', end: '17:00'},
        {days: [7], start: '09:00', end: '17:00'},
        {days: [1], start: '09:15', end: '17:00'},
        {days: [1], start: '17:00', end: '09:00'},
    ]) {
        assert.equal(workingHoursSchema.safeParse(bad).success, false, JSON.stringify(bad));
    }
});
