import axios, {AxiosError, type InternalAxiosRequestConfig} from 'axios';
import {queryClient, sessionKey} from './queryClient';
import type {Session} from './types';

// The access token lives in memory only; the refresh token is an httpOnly cookie JS can't read.
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
    accessToken = token;
};
export const getAccessToken = () => accessToken;

/** Signs out locally. Updates the session in place (clear() would orphan mounted observers). */
export function endSession() {
    setAccessToken(null);
    queryClient.setQueryData(sessionKey, null);
    queryClient.removeQueries({predicate: (q) => q.queryKey[0] !== sessionKey[0]});
}

export const http = axios.create({baseURL: '/api', withCredentials: true});

http.interceptors.request.use((config) => {
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
});

let refreshing: Promise<Session> | null = null;

/** Trades the refresh cookie for a new access token. Concurrent callers share one request,
 *  because the server rotates the refresh token and a second parallel call would be rejected. */
export function refreshSession() {
    refreshing ??= http
        .post<Session>('/auth/refresh')
        .then(({data}) => {
            setAccessToken(data.accessToken);
            return data;
        })
        .finally(() => {
            refreshing = null;
        });
    return refreshing;
}

type RetryConfig = InternalAxiosRequestConfig & {_retried?: boolean};

http.interceptors.response.use(undefined, async (err: AxiosError<{error?: string}>) => {
    const config = err.config as RetryConfig | undefined;
    if (err.response?.status === 401 && config && !config._retried && !config.url?.startsWith('/auth/')) {
        config._retried = true;
        try {
            await refreshSession();
            return await http(config);
        } catch {
            endSession();
        }
    }
    throw new Error(err.response?.data?.error ?? err.message);
});

/** Random key for the server's Idempotency-Key header (works on plain http, unlike randomUUID). */
export const idempotencyKey = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
