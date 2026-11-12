import {startService} from '#shared/server.ts';
import {routes} from './routes.ts';
import {seedAdmin} from './lib/seedAdmin.ts';

await startService({dbName: 'hms_identity', routes, onStart: seedAdmin});
