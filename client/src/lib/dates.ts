import {format} from 'date-fns';

/** Display formats used across the app (viewer's local time). */
export const formatDateTime = (d: string | Date) => format(d, 'dd MMM yyyy, HH:mm');
export const formatDate = (d: string | Date) => format(d, 'dd MMM yyyy');
export const formatTime = (d: string | Date) => format(d, 'HH:mm');
/** YYYY-MM-DD, the value format of <input type="date">. */
export const toDayValue = (d: Date) => format(d, 'yyyy-MM-dd');
