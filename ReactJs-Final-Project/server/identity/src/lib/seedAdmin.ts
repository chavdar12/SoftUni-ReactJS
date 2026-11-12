import bcrypt from 'bcryptjs';
import {config} from '../config.ts';
import {User} from '../models/User.ts';
import {logger} from '../../../shared/src/lib/logger.ts';

/** Creates the admin from env on first start. Upsert, so many replicas booting at once create it once. */
export async function seedAdmin() {
    if (!config.adminEmail || !config.adminPassword) return;
    const {upsertedCount} = await User.updateOne(
        {email: config.adminEmail.toLowerCase()},
        {$setOnInsert: {name: 'Admin', role: 'admin', passwordHash: await bcrypt.hash(config.adminPassword, 10)}},
        {upsert: true},
    ).catch((err) => {
        if (err.code !== 11000) throw err;
        return {upsertedCount: 0};
    });
    if (upsertedCount) logger.info('admin account created', {email: config.adminEmail});
}
