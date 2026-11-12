import {config} from '#identity/config.ts';
import {userRepository} from '#identity/repositories/user.repository.ts';
import {hashPassword} from '#identity/services/helpers.ts';
import {logger} from '#shared/lib/logger.ts';

/** Creates the admin from env on first start. Upsert, so many replicas booting at once create it once. */
export async function seedAdmin() {
    if (!config.adminEmail || !config.adminPassword) return;
    const email = config.adminEmail.toLowerCase();
    const created = await userRepository
        .insertIfAbsent(email, {name: 'Admin', role: 'admin', passwordHash: await hashPassword(config.adminPassword)})
        .catch((err) => {
            if (err.code !== 11000) throw err; // another replica won the race
            return false;
        });
    if (created) logger.info('admin account created', {email});
}
