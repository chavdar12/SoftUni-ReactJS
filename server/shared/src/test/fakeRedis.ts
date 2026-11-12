/** In-memory stand-in for the ioredis calls the services make. TTLs are recorded, not enforced. */
export function fakeRedis() {
    const store = new Map<string, string | Set<string>>();
    const ttl = new Map<string, number>();
    const str = (k: string) => store.get(k) as string | undefined;
    const set = (k: string) => {
        if (!store.has(k)) store.set(k, new Set());
        return store.get(k) as Set<string>;
    };

    const api = {
        store,
        ttl,
        get: async (k: string) => str(k) ?? null,
        set: async (k: string, v: string, ...args: unknown[]) => {
            if (args.includes('NX') && store.has(k)) return null;
            store.set(k, v);
            const ex = args.indexOf('EX');
            if (ex >= 0) ttl.set(k, args[ex + 1] as number);
            return 'OK';
        },
        getdel: async (k: string) => {
            const v = str(k) ?? null;
            store.delete(k);
            return v;
        },
        del: async (...keys: string[]) => keys.filter((k) => store.delete(k)).length,
        incr: async (k: string) => {
            const n = Number(str(k) ?? 0) + 1;
            store.set(k, String(n));
            return n;
        },
        expire: async (k: string, seconds: number, mode?: string) => {
            if (mode === 'NX' && ttl.has(k)) return 0;
            ttl.set(k, seconds);
            return 1;
        },
        sadd: async (k: string, m: string) => Number(!set(k).has(m) && !!set(k).add(m)),
        srem: async (k: string, m: string) => Number(set(k).delete(m)),
        smembers: async (k: string) => [...set(k)],
        multi() {
            const queued: Promise<unknown>[] = [];
            const chain = new Proxy({} as Record<string, unknown>, {
                get: (_t, name: string) =>
                    name === 'exec'
                        ? async () => (await Promise.all(queued)).map((r) => [null, r])
                        : (...args: unknown[]) => {
                              queued.push((api as any)[name](...args));
                              return chain;
                          },
            });
            return chain as any;
        },
    };
    return api;
}
