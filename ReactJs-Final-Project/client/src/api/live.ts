import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {endSession, getAccessToken, refreshSession} from './client';
import {keys} from './hooks';

const RETRY_MS = 5000;

/**
 * Listens to the server's change stream and refetches appointment data when something changes.
 * fetch() rather than EventSource, because EventSource can't send the Authorization header.
 */
export function useLiveUpdates(enabled: boolean) {
    const qc = useQueryClient();

    useEffect(() => {
        if (!enabled) return;
        const ctrl = new AbortController();
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const refetch = () =>
            [keys.appointments, keys.prescriptions, keys.stats, keys.history].forEach((queryKey) =>
                qc.invalidateQueries({queryKey}),
            );

        void (async () => {
            while (!ctrl.signal.aborted) {
                try {
                    const res = await fetch('/api/events', {
                        headers: {Authorization: `Bearer ${getAccessToken()}`},
                        signal: ctrl.signal,
                    });
                    if (res.status === 401) {
                        await refreshSession().catch(() => {
                            endSession();
                            ctrl.abort();
                        });
                        continue;
                    }
                    if (!res.ok || !res.body) throw new Error(`events: ${res.status}`);
                    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
                    for (;;) {
                        const {value, done} = await reader.read();
                        if (done) break;
                        if (value.includes('data:')) refetch();
                    }
                } catch {
                    if (ctrl.signal.aborted) return;
                }
                await wait(RETRY_MS);
            }
        })();
        return () => ctrl.abort();
    }, [enabled, qc]);
}
