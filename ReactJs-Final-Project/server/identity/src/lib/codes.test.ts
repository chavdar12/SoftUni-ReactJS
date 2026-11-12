import {mock, test} from 'node:test';
import assert from 'node:assert/strict';
import {fakeRedis} from '#shared/test/fakeRedis.ts';

const redis = fakeRedis();
mock.module(import.meta.resolve('#shared/lib/redis.ts'), {exports: {redis}});
const {checkCode, issueCode, MAX_ATTEMPTS} = await import('./codes.ts');

test('a code works once and returns its target', async () => {
    const code = await issueCode('verify-email', 'u1', 'a@x.co');
    assert.match(code, /^\d{6}$/);
    assert.equal(await checkCode('verify-email', 'u1', code), 'a@x.co');
    await assert.rejects(checkCode('verify-email', 'u1', code), /expired/);
});

test('codes are per purpose', async () => {
    const code = await issueCode('login', 'u2', 'a@x.co');
    await assert.rejects(checkCode('verify-email', 'u2', code), /expired/);
});

test('too many wrong guesses burn the code', async () => {
    const code = await issueCode('verify-phone', 'u3', '+359888');
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 1; i < MAX_ATTEMPTS; i++) await assert.rejects(checkCode('verify-phone', 'u3', wrong), /Wrong code/);
    await assert.rejects(checkCode('verify-phone', 'u3', wrong), /Too many/);
    await assert.rejects(checkCode('verify-phone', 'u3', code), /expired/);
});

test('resending within a minute is refused', async () => {
    await issueCode('login', 'u4', 'a@x.co');
    await assert.rejects(issueCode('login', 'u4', 'a@x.co'), {status: 429});
});
