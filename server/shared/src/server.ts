import {once} from 'node:events';
import express, {type Router} from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import {config} from './config.ts';
import {logger} from './lib/logger.ts';
import {redis} from './lib/redis.ts';
import {errorHandler} from './middleware/errors.ts';
import {requestLog} from './middleware/requestLog.ts';

interface Service {
    dbName: string;
    routes: Router;
    onStart?: () => Promise<void>;
}

/** Boots a service: Mongo, HTTP with probes + logging, crash handlers and graceful shutdown. */
export async function startService({dbName, routes, onStart}: Service) {
    // After an unexpected error the process state is unknown: log it and exit; the orchestrator restarts the pod.
    process.on('uncaughtException', (err) => {
        logger.fatal('uncaught exception', {err});
        process.exit(1);
    });
    process.on('unhandledRejection', (err) => {
        logger.fatal('unhandled rejection', {err});
        process.exit(1);
    });

    mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
    mongoose.connection.on('reconnected', () => logger.info('mongo reconnected'));

    try {
        await mongoose.connect(config.mongoUrl, {dbName, serverSelectionTimeoutMS: 10_000});
        await onStart?.();
    } catch (err) {
        logger.fatal('startup failed', {err});
        process.exit(1);
    }

    let draining = false;
    const app = express();
    app.set('trust proxy', 1); // behind nginx
    app.disable('x-powered-by');

    // Probes sit before the request log so they don't flood it.
    app.get('/healthz', (_req, res) => {
        res.json({ok: true});
    });
    app.get('/readyz', (_req, res) => {
        const ready = !draining && mongoose.connection.readyState === 1;
        res.status(ready ? 200 : 503).json({ready});
    });

    app.use(requestLog, express.json({limit: '100kb'}), cookieParser());
    app.use('/api', routes);
    app.use(errorHandler);

    const server = app.listen(config.port, () => logger.info('listening', {port: config.port}));
    // Longer than nginx's upstream keepalive (60s), so nginx never reuses a socket we already closed (-> 502).
    server.keepAliveTimeout = 65_000;

    /** Stop taking work, let in-flight requests finish, then close connections. */
    async function shutdown(signal: string) {
        if (draining) return;
        draining = true;
        logger.info('draining', {signal});
        setTimeout(() => {
            logger.error('forced exit: requests still open after 20s');
            process.exit(1);
        }, 20_000).unref();

        server.close();
        await once(server, 'close');
        await Promise.allSettled([mongoose.disconnect(), redis.quit()]);
        logger.info('stopped');
        process.exit(0);
    }

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
}
