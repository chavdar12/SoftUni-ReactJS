import {mock, test} from 'node:test';
import assert from 'node:assert/strict';
import {fakeRedis} from '#shared/test/fakeRedis.ts';

const redis = fakeRedis();
mock.module(import.meta.resolve('#shared/lib/redis.ts'), {exports: {redis}});
const {assertNotLocked, clearFailures, recordFailure, MAX_FAILURES} = await import('./lockout.ts');

test('locks an account after too many failures, per email, case-insensitively', async () => {
    for (let i = 0; i < MAX_FAILURES; i++) {
        await assertNotLocked('Ana@x.co');
        await recordFailure('Ana@x.co');
    }
    await assert.rejects(assertNotLocked('ana@x.co'), {status: 429});
    await assertNotLocked('bob@x.co');
    assert.equal(redis.ttl.get('login-fail:ana@x.co'), 15 * 60);
});

test('a successful login clears the counter', async () => {
    await recordFailure('c@x.co');
    await clearFailures('c@x.co');
    assert.equal(await redis.get('login-fail:c@x.co'), null);
});
