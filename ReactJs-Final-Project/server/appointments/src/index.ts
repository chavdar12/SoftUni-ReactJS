import {startService} from '#shared/server.ts';
import {routes} from './routes.ts';
import {startReminders} from './lib/reminders.ts';

await startService({dbName: 'hms_appointments', routes, onStart: async () => startReminders()});
