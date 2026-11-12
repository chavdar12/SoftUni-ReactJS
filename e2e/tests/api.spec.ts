import {expect, test} from '@playwright/test';

const run = Date.now().toString(36);

async function signUp(request: import('@playwright/test').APIRequestContext, tag: string) {
    const res = await request.post('/api/auth/signup', {
        data: {name: `API ${tag}`, email: `${tag}-${run}@e2e.test`, phone: '+359888000000', password: 'secret123'},
    });
    expect(res.status()).toBe(201);
    return (await res.json()).accessToken as string;
}

test('refresh token rotates: an old one cannot be reused', async ({playwright, baseURL}) => {
    const request = await playwright.request.newContext({baseURL});
    await signUp(request, 'rotate');
    const {cookies} = await request.storageState();
    const original = cookies.find((c) => c.name === 'refreshToken')!;

    expect((await request.post('/api/auth/refresh')).status()).toBe(200);

    const replay = await playwright.request.newContext({baseURL, storageState: {cookies: [original], origins: []}});
    expect((await replay.post('/api/auth/refresh')).status()).toBe(401);
});

test('logout revokes the refresh token', async ({request}) => {
    await signUp(request, 'logout');
    expect((await request.post('/api/auth/logout')).status()).toBe(204);
    expect((await request.post('/api/auth/refresh')).status()).toBe(401);
});

test('booking with the same Idempotency-Key creates one appointment', async ({request}) => {
    const admin = await request.post('/api/auth/login', {
        data: {email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD},
    });
    const doctor = await request.post('/api/doctors', {
        headers: {Authorization: `Bearer ${(await admin.json()).accessToken}`},
        data: {name: 'Dr Idem', email: `idem-doc-${run}@e2e.test`, password: 'secret123', specialization: 'General', roomNumber: 1},
    });
    expect(doctor.status()).toBe(201);

    const token = await signUp(request, 'idem');
    const auth = {Authorization: `Bearer ${token}`};
    const doctors = [await doctor.json()];

    const book = () =>
        request.post('/api/appointments', {
            headers: {...auth, 'Idempotency-Key': `key-${run}`},
            data: {doctorId: doctors[0].id, date: '2030-02-01T10:00:00.000Z'},
        });
    const first = await book();
    const second = await book();

    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);
    expect(second.headers()['idempotent-replayed']).toBe('true');
    expect((await second.json()).id).toBe((await first.json()).id);
    expect(await (await request.get('/api/appointments', {headers: auth})).json()).toHaveLength(1);
});

test('API rejects missing tokens and wrong roles', async ({request}) => {
    expect((await request.get('/api/appointments')).status()).toBe(401);
    const token = await signUp(request, 'role');
    expect((await request.get('/api/patients', {headers: {Authorization: `Bearer ${token}`}})).status()).toBe(403);
});

test('zod rejects bad bodies and ids with 400', async ({request}) => {
    const bad = await request.post('/api/auth/signup', {data: {name: '', email: 'nope', phone: '1', password: '1'}});
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error).toMatch(/email/);

    const token = await signUp(request, 'zod');
    const res = await request.patch('/api/appointments/not-an-id/cancel', {headers: {Authorization: `Bearer ${token}`}});
    expect(res.status()).toBe(400);
});
