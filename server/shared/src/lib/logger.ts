import {hostname} from 'node:os';
import {trace} from '@opentelemetry/api';

// JSON lines on stdout/stderr: what `kubectl logs` and any log collector (Loki, ELK, CloudWatch) expect.
const LEVELS = {debug: 10, info: 20, warn: 30, error: 40, fatal: 50};
type Level = keyof typeof LEVELS;

const min = LEVELS[process.env.LOG_LEVEL as Level] ?? LEVELS.info;
const base = {service: process.env.SERVICE, pod: hostname()};

const serializeError = (err: unknown) =>
    err instanceof Error ? {name: err.name, message: err.message, stack: err.stack, code: (err as {code?: unknown}).code} : err;

function write(level: Level, msg: string, fields: Record<string, unknown> = {}) {
    if (LEVELS[level] < min) return;
    // traceId links a log line to its trace in Tempo (undefined when tracing is off, e.g. local dev).
    const traceId = trace.getActiveSpan()?.spanContext().traceId;
    const entry = {time: new Date().toISOString(), level, msg, ...base, traceId, ...fields, err: serializeError(fields.err)};
    (LEVELS[level] >= LEVELS.error ? process.stderr : process.stdout).write(JSON.stringify(entry) + '\n');
}

export const logger = {
    debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
    info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
    warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
    error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
    fatal: (msg: string, fields?: Record<string, unknown>) => write('fatal', msg, fields),
};
