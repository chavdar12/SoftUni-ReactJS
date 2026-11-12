import {startService} from '../../shared/src/server.ts';
import {routes} from './routes.ts';

await startService({dbName: 'hms_appointments', routes});
