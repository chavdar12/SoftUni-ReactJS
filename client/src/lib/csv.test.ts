import {toCsv} from './csv';

test('quotes cells that need it and defuses formulas', () => {
    const rows = [{id: '1', name: 'Ana, "Dr"', note: '=HYPERLINK("x")'}, {id: '2', name: 'Bo', note: undefined}];
    const csv = toCsv(rows, [{id: 'name', label: 'Name'}, {id: 'note', label: 'Note'}]);
    expect(csv.split('\r\n')).toEqual(['Name,Note', '"Ana, ""Dr""","\'=HYPERLINK(""x"")"', 'Bo,']);
});
