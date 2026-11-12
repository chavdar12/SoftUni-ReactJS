import {test} from 'node:test';
import assert from 'node:assert/strict';
import {base32Decode, base32Encode, generateSecret, hotp, otpauthUrl, verifyTotp} from './totp.ts';

const rfcKey = Buffer.from('12345678901234567890'); // RFC 4226 / 6238 test key

test('HOTP matches the RFC 4226 test values', () => {
    const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    expected.forEach((code, counter) => assert.equal(hotp(rfcKey, counter), code));
});

test('TOTP matches RFC 6238 (last 6 digits of its SHA-1 vectors)', () => {
    const secret = base32Encode(rfcKey);
    for (const [seconds, code8] of [[59, '94287082'], [1111111109, '07081804'], [1234567890, '89005924'], [2000000000, '69279037']] as const) {
        assert.notEqual(verifyTotp(secret, code8.slice(2), seconds * 1000), null, `t=${seconds}`);
    }
});

test('accepts one step of drift, rejects older codes and junk', () => {
    const secret = generateSecret();
    const key = base32Decode(secret);
    const now = 1_800_000_000_000;
    const step = Math.floor(now / 30_000);
    assert.equal(verifyTotp(secret, hotp(key, step - 1), now), step - 1);
    assert.equal(verifyTotp(secret, hotp(key, step + 1), now), step + 1);
    assert.equal(verifyTotp(secret, hotp(key, step - 2), now), null);
    assert.equal(verifyTotp(secret, 'abcdef', now), null);
    assert.equal(verifyTotp(secret, '12345', now), null);
});

test('base32 round-trips and the otpauth URL carries the secret', () => {
    const secret = generateSecret();
    assert.equal(secret.length, 32);
    assert.equal(base32Encode(base32Decode(secret)), secret);
    const url = new URL(otpauthUrl(secret, 'ana@example.com'));
    assert.equal(url.protocol, 'otpauth:');
    assert.equal(url.searchParams.get('secret'), secret);
    assert.equal(url.host, 'totp');
    assert.equal(decodeURIComponent(url.pathname), '/HMS:ana@example.com');
});
