import {Redis} from 'ioredis';
import {config} from '../config.ts';
import {logger} from './logger.ts';

// Fail fast while Redis is down instead of queueing requests until it comes back.
export const redis = new Redis(config.redisUrl, {maxRetriesPerRequest: 1});

redis.on('error', (err) => logger.warn('redis error', {err}));
redis.on('ready', () => logger.info('redis ready'));
