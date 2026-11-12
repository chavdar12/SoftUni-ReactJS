import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable, {type Column} from './DataTable';

type Row = {id: string; name: string; date: string};
const columns: Column<Row>[] = [
    {id: 'name', label: 'Name'},
    {id: 'date', label: 'Date', format: (v) => `on ${v}`},
];
const rows: Row[] = Array.from({length: 12}, (_, i) => ({id: String(i), name: `Row ${i}`, date: `d${i}`}));

test('renders formatted rows with actions and paginates', async () => {
    render(<DataTable columns={columns} rows={rows} actions={(r) => <button>act {r.name}</button>}/>);

    expect(screen.getByText('on d0')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'act Row 9'})).toBeInTheDocument();
    expect(screen.queryByText('Row 10')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: /next page/i}));
    expect(screen.getByText('Row 10')).toBeInTheDocument();
    expect(screen.queryByText('Row 0')).not.toBeInTheDocument();
});

test('shows an empty state', () => {
    render(<DataTable columns={columns} rows={[]}/>);
    const body = screen.getAllByRole('rowgroup')[1];
    expect(within(body).getByText('No records')).toBeInTheDocument();
});
