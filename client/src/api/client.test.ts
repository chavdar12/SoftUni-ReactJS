import type {AxiosAdapter, InternalAxiosRequestConfig} from 'axios';
import {http, setAccessToken} from './client';
import {queryClient, sessionKey} from './queryClient';

/** Fake server: accepts only `Bearer fresh`; /auth/refresh succeeds `refreshes` times. */
function fakeServer(refreshes: number) {
    const calls: string[] = [];
    const reply = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
        const res = {data, status, statusText: '', headers: {}, config};
        if (status >= 400) return Promise.reject(Object.assign(new Error(`status ${status}`), {config, response: res}));
        return Promise.resolve(res);
    };
    const adapter: AxiosAdapter = (config) => {
        calls.push(`${config.url} ${config.headers.Authorization ?? ''}`.trim());
        if (config.url === '/auth/refresh') {
            return refreshes-- > 0
                ? reply(config, 200, {accessToken: 'fresh', user: {id: 'u1'}})
                : reply(config, 401, {error: 'Session expired'});
        }
        return config.headers.Authorization === 'Bearer fresh'
            ? reply(config, 200, ['ok'])
            : reply(config, 401, {error: 'Session expired'});
    };
    http.defaults.adapter = adapter;
    return calls;
}

test('refreshes once on 401 and retries with the new token', async () => {
    setAccessToken('stale');
    const calls = fakeServer(1);

    const [a, b] = await Promise.all([http.get('/doctors'), http.get('/appointments')]);

    expect(a.data).toEqual(['ok']);
    expect(b.data).toEqual(['ok']);
    expect(calls.filter((c) => c.startsWith('/auth/refresh'))).toHaveLength(1);
});

test('signs the user out when the refresh fails', async () => {
    setAccessToken('stale');
    fakeServer(0);
    queryClient.setQueryData(sessionKey, {id: 'u1'});

    await expect(http.get('/doctors')).rejects.toThrow('Session expired');
    expect(queryClient.getQueryData(sessionKey)).toBeNull();
});
