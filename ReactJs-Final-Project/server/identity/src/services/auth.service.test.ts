import {mock, test} from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {fakeRedis} from '#shared/test/fakeRedis.ts';

// Fake repository, Redis and mailer: login rules run without Mongo, Redis or SMTP.
const hash = await bcrypt.hash('secret12', 4);
const user = (fields: Record<string, unknown> = {}): any => ({
    id: 'u1', name: 'Ana', email: 'ana@x.co', role: 'patient', passwordHash: hash, passkeys: [], ...fields,
});
let stored: any = user();
const repo = {
    findActiveByEmail: async (email: string) => (email === stored.email ? stored : null),
    findActiveById: async (id: string) => (id === stored.id ? stored : null),
    findById: async (id: string) => (id === stored.id ? stored : null),
    save: async () => {},
};
const redis = fakeRedis();
const mails: {to: string; subject: string; text: string}[] = [];
const url = (p: string) => new URL(p, import.meta.url).href;
mock.module(import.meta.resolve('#identity/repositories/user.repository.ts'), {exports: {userRepository: repo}});
mock.module(import.meta.resolve('#shared/lib/redis.ts'), {exports: {redis}});
mock.module(import.meta.resolve('#shared/lib/mailer.ts'), {exports: {sendMail: async (m: any) => void mails.push(m), sendSms: async () => {}}});
const auth = await import('./auth.service.ts');
const security = await import('./security.service.ts');

const refreshKeys = () => [...redis.store.keys()].filter((k) => k.startsWith('refresh:'));

test('password only: a session whose user DTO carries no secrets', async () => {
    stored = user();
    const result = await auth.login({email: 'ana@x.co', password: 'secret12'});
    assert.ok('session' in result);
    assert.ok(result.refreshToken);
    assert.equal(result.session.user.email, 'ana@x.co');
    for (const secret of ['passwordHash', 'totp', 'passkeys', 'emailCodeLogin']) assert.ok(!(secret in result.session.user), secret);
});

test('wrong passwords lock the account after 5 tries', async () => {
    stored = user({email: 'bob@x.co'});
    for (let i = 0; i < 5; i++) await assert.rejects(auth.login({email: 'bob@x.co', password: 'nope'}), {status: 401});
    await assert.rejects(auth.login({email: 'bob@x.co', password: 'secret12'}), {status: 429});
});

test('with two-step on, the password alone issues no session', async () => {
    stored = user({id: 'u2', email: 'cy@x.co', emailVerified: true, emailCodeLogin: true});
    const before = refreshKeys().length;
    const result = await auth.login({email: 'cy@x.co', password: 'secret12'});
    assert.ok('mfaRequired' in result);
    assert.deepEqual(result.methods, ['email']);
    assert.equal(refreshKeys().length, before);

    await auth.sendLoginCode({mfaToken: result.mfaToken});
    const code = mails.at(-1)!.subject.slice(0, 6);
    await assert.rejects(auth.verifyMfa({mfaToken: result.mfaToken, method: 'totp', code}), {status: 400}); // not enabled
    const done = await auth.verifyMfa({mfaToken: result.mfaToken, method: 'email', code});
    assert.equal(done.session.user.id, 'u2');
    await assert.rejects(auth.verifyMfa({mfaToken: result.mfaToken, method: 'email', code}), {status: 401}); // ticket used
});

test('forgot password says nothing about unknown emails', async () => {
    const sent = mails.length;
    await auth.forgotPassword({email: 'nobody@x.co'});
    assert.equal(mails.length, sent);
});

test('adding a passkey re-checks the password first', async () => {
    stored = user({id: 'u3', email: 'dee@x.co'});
    await assert.rejects(security.passkeyRegistrationOptions('u3', {password: 'nope'}), {status: 400, message: 'Wrong password'});
    assert.equal(await redis.get('webauthn-reg:u3'), null); // no challenge issued
    const options = await security.passkeyRegistrationOptions('u3', {password: 'secret12'});
    assert.equal(options.rp.id, 'localhost');
    assert.equal(await redis.get('webauthn-reg:u3'), options.challenge);
});
