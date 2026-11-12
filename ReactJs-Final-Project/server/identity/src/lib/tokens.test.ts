import {mock, test} from 'node:test';
import assert from 'node:assert/strict';
import {fakeRedis} from '#shared/test/fakeRedis.ts';

const redis = fakeRedis();
mock.module(import.meta.resolve('#shared/lib/redis.ts'), {exports: {redis}});
const tokens = await import('./tokens.ts');

test('refresh tokens are single use', async () => {
    const t = await tokens.issueRefreshToken('u1');
    assert.equal(await tokens.consumeRefreshToken(t), 'u1');
    await assert.rejects(tokens.consumeRefreshToken(t), /Session expired/);
});

test('log out everywhere revokes every session of that user only', async () => {
    const a = await tokens.issueRefreshToken('u2');
    const b = await tokens.issueRefreshToken('u2');
    const other = await tokens.issueRefreshToken('u3');

    await tokens.revokeAllRefreshTokens('u2');

    await assert.rejects(tokens.consumeRefreshToken(a));
    await assert.rejects(tokens.consumeRefreshToken(b));
    assert.equal(await tokens.consumeRefreshToken(other), 'u3');
});

test('a consumed token leaves the session set', async () => {
    const t = await tokens.issueRefreshToken('u4');
    await tokens.consumeRefreshToken(t);
    assert.deepEqual(await redis.smembers('sessions:u4'), []);
});

test('reset tokens are single use and stored hashed', async () => {
    const t = await tokens.issueResetToken('u5');
    assert.ok(![...redis.store.keys()].some((k) => k.includes(t)));
    assert.equal(await tokens.consumeResetToken(t), 'u5');
    await assert.rejects(tokens.consumeResetToken(t), /invalid or has expired/);
});
