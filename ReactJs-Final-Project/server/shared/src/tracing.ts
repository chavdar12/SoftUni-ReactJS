// Preloaded with `node --import ./shared/src/tracing.ts` (see the Dockerfiles) so modules are patched before
// the app imports them. Exporters and service name come from the standard OTEL_* env vars (k8s manifests).
import {register} from 'node:module';
import {NodeSDK} from '@opentelemetry/sdk-node';
import {HttpInstrumentation} from '@opentelemetry/instrumentation-http';
import {ExpressInstrumentation} from '@opentelemetry/instrumentation-express';
import {MongooseInstrumentation} from '@opentelemetry/instrumentation-mongoose';
import {IORedisInstrumentation} from '@opentelemetry/instrumentation-ioredis';
import {UndiciInstrumentation} from '@opentelemetry/instrumentation-undici';

// ESM imports can only be patched through this loader hook.
register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

const probes = new Set(['/healthz', '/readyz']);

new NodeSDK({
    instrumentations: [
        new HttpInstrumentation({ignoreIncomingRequestHook: (req) => probes.has(req.url ?? '')}),
        new ExpressInstrumentation(),
        new MongooseInstrumentation(),
        new IORedisInstrumentation(),
        new UndiciInstrumentation(), // fetch() from appointments -> identity, carries the trace along
    ],
}).start();
