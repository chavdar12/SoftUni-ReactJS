import {groupByDay, startOfWeek} from './week';

test('startOfWeek goes back to Monday, and stays on Monday', () => {
    expect(startOfWeek(new Date(2030, 0, 17, 15)).toDateString()).toBe(new Date(2030, 0, 14).toDateString()); // Thu
    expect(startOfWeek(new Date(2030, 0, 20)).toDateString()).toBe(new Date(2030, 0, 14).toDateString()); // Sun
    expect(startOfWeek(new Date(2030, 0, 14)).toDateString()).toBe(new Date(2030, 0, 14).toDateString()); // Mon
});

test('groupByDay buckets by local day and sorts by time', () => {
    const at = (d: number, h: number) => new Date(2030, 0, d, h).toISOString();
    const items = [{date: at(15, 11)}, {date: at(15, 9)}, {date: at(20, 10)}, {date: at(21, 10)}];
    const week = groupByDay(new Date(2030, 0, 14), items);
    expect(week.map((d) => d.items.length)).toEqual([0, 2, 0, 0, 0, 0, 1]);
    expect(week[1].items[0].date).toBe(at(15, 9));
});
