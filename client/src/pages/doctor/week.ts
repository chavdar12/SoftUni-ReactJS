import {addDays, isSameDay, startOfWeek as weekStart} from 'date-fns';

export {addDays};

/** Monday 00:00 (local) of the week containing `d`. */
export const startOfWeek = (d: Date) => weekStart(d, {weekStartsOn: 1});

/** The 7 days from `monday`, each with its items (by local date), sorted by time. */
export function groupByDay<T extends {date: string}>(monday: Date, items: T[]) {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    return Array.from({length: 7}, (_, i) => {
        const day = addDays(monday, i);
        return {day, items: sorted.filter((it) => isSameDay(it.date, day))};
    });
}
