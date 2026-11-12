import {TZDate} from '@date-fns/tz';
import {type WorkingHours, SLOT_MINUTES, toMinutes} from '#shared/lib/hours.ts';

/** Midnight of `day` (YYYY-MM-DD) on the clinic's clock. */
const midnight = (day: string, tz: string) => {
    const [y, m, d] = day.split('-').map(Number);
    return new TZDate(y, m - 1, d, tz);
};

/** The instant at which the clock in `tz` shows `minutes` past midnight on `day`. */
export const zonedTime = (day: string, minutes: number, tz: string) => {
    const t = midnight(day, tz);
    t.setMinutes(minutes); // wall-clock arithmetic, so DST days come out right
    return new Date(t.getTime());
};

/** Every slot start on `day` within the doctor's hours (none on days off). */
export function daySlots(day: string, hours: WorkingHours, tz: string): Date[] {
    if (!hours.days.includes(midnight(day, tz).getDay())) return [];
    const slots = [];
    for (let min = toMinutes(hours.start); min + SLOT_MINUTES <= toMinutes(hours.end); min += SLOT_MINUTES) {
        slots.push(zonedTime(day, min, tz));
    }
    return slots;
}

/** True when `date` starts a whole slot inside the doctor's hours. */
export function isWorkingSlot(date: Date, hours: WorkingHours, tz: string) {
    if (date.getTime() % (SLOT_MINUTES * 60_000) !== 0) return false;
    const local = new TZDate(date, tz);
    const minutes = local.getHours() * 60 + local.getMinutes();
    return (
        hours.days.includes(local.getDay()) &&
        minutes % SLOT_MINUTES === 0 &&
        minutes >= toMinutes(hours.start) &&
        minutes + SLOT_MINUTES <= toMinutes(hours.end)
    );
}
