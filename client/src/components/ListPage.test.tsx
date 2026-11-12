import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useQuery} from '@tanstack/react-query';
import {renderWithProviders} from '@/test/render';
import ListPage from './ListPage';
import {pageLocally} from '@/api/hooks';
import type {ListParams} from '@/api/types';

const rows = Array.from({length: 12}, (_, i) => ({id: String(i), name: i === 7 ? 'Ana' : `Patient ${i}`}));
const seen: ListParams[] = [];

function useRows(p: ListParams) {
    seen.push(p);
    return useQuery({queryKey: ['rows', p], queryFn: async () => pageLocally(rows, p)});
}

test('pages and searches through the source hook', async () => {
    renderWithProviders(<ListPage title="People" source={useRows} columns={[{id: 'name', label: 'Name'}]}/>);

    expect(await screen.findByText('Patient 0')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: /next page/i}));
    expect(await screen.findByText('Patient 10')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Search'), 'ana');
    await waitFor(() => expect(screen.queryByText('Patient 10')).not.toBeInTheDocument());
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(seen.at(-1)).toEqual({page: 0, limit: 10, q: 'ana'}); // search goes back to page 1
});

test('pageLocally ignores nested objects and matches any field', () => {
    const r = pageLocally([{id: '1', a: 'x', o: {deep: 'ana'}}, {id: '2', a: 'Ana'}], {page: 0, limit: 10, q: 'ANA'});
    expect(r).toEqual({items: [{id: '2', a: 'Ana'}], total: 1});
});
