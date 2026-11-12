import {test} from 'node:test';
import assert from 'node:assert/strict';
import {daySlots, isWorkingSlot, zonedTime} from './slots.ts';
import {DEFAULT_HOURS} from '#shared/lib/hours.ts';

const TZ = 'Europe/Sofia'; // UTC+2 in winter, UTC+3 in summer

test('zonedTime converts clinic wall-clock time to an instant, across DST', () => {
    assert.equal(zonedTime('2030-01-15', 9 * 60, TZ).toISOString(), '2030-01-15T07:00:00.000Z');
    assert.equal(zonedTime('2030-07-15', 9 * 60, TZ).toISOString(), '2030-07-15T06:00:00.000Z');
    // 2030-03-31 is the spring-forward day in the EU (03:00 -> 04:00).
    assert.equal(zonedTime('2030-03-31', 12 * 60, TZ).toISOString(), '2030-03-31T09:00:00.000Z');
});

test('daySlots lists half-hour starts within hours, none on days off', () => {
    const slots = daySlots('2030-01-15', DEFAULT_HOURS, TZ); // Tuesday
    assert.equal(slots.length, 16); // 09:00..16:30
    assert.equal(slots[0].toISOString(), '2030-01-15T07:00:00.000Z');
    assert.equal(slots.at(-1)!.toISOString(), '2030-01-15T14:30:00.000Z');
    assert.deepEqual(daySlots('2030-01-19', DEFAULT_HOURS, TZ), []); // Saturday
});

test('isWorkingSlot accepts exactly the listed slots', () => {
    for (const s of daySlots('2030-01-15', DEFAULT_HOURS, TZ)) assert.ok(isWorkingSlot(s, DEFAULT_HOURS, TZ));
    assert.equal(isWorkingSlot(new Date('2030-01-15T06:30:00Z'), DEFAULT_HOURS, TZ), false); // 08:30 local
    assert.equal(isWorkingSlot(new Date('2030-01-15T15:00:00Z'), DEFAULT_HOURS, TZ), false); // 17:00 local
    assert.equal(isWorkingSlot(new Date('2030-01-15T07:15:00Z'), DEFAULT_HOURS, TZ), false); // off-slot
    assert.equal(isWorkingSlot(new Date('2030-01-19T08:00:00Z'), DEFAULT_HOURS, TZ), false); // Saturday
    const weekend = {days: [6], start: '10:00', end: '12:00'};
    assert.ok(isWorkingSlot(new Date('2030-01-19T08:00:00Z'), weekend, TZ));
});
