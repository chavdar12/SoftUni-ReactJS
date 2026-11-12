import {type ReactNode, useEffect, useState} from 'react';
import {Alert, Button, LinearProgress, Paper, Stack, TextField, Typography} from '@mui/material';
import type {UseQueryResult} from '@tanstack/react-query';
import DataTable, {type Column} from './DataTable';
import type {ListParams, Paged} from '@/api/types';
import {downloadCsv, toCsv} from '@/lib/csv';

interface Props<T> {
    title: string;
    /** A query hook taking list params; called on every render, so pass a stable hook. */
    source: (params: ListParams) => UseQueryResult<Paged<T>>;
    columns: Column<T>[];
    /** Fixed extra filters (e.g. a date range from tabs). Changing them goes back to page 1. */
    filters?: Partial<ListParams>;
    actions?: (row: T) => ReactNode;
    /** Shows "Export CSV": fetches every matching row and downloads them. */
    exportRows?: (params: ListParams) => Promise<T[]>;
    children?: ReactNode;
}

/** A titled, searchable, paged table of a list query's rows, with its loading and error states. */
export default function ListPage<T extends {id: string}>(props: Props<T>) {
    const {title, source, columns, filters, actions, exportRows, children} = props;
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [paging, setPaging] = useState({page: 0, perPage: 10});
    const [exportError, setExportError] = useState('');

    useEffect(() => {
        const next = search.trim();
        if (next === q) return; // e.g. on mount: don't snap back to page 1
        const t = setTimeout(() => {
            setQ(next);
            setPaging((p) => ({...p, page: 0}));
        }, 300);
        return () => clearTimeout(t);
    }, [search, q]);

    const filterKey = JSON.stringify(filters ?? {});
    useEffect(() => setPaging((p) => ({...p, page: 0})), [filterKey]);

    const params: ListParams = {...filters, page: paging.page, limit: paging.perPage, ...(q && {q})};
    const query = source(params);

    const exportCsv = () =>
        exportRows?.(params)
            .then((rows) => downloadCsv(`${title.toLowerCase().replace(/\W+/g, '-')}.csv`, toCsv(rows, columns)))
            .catch((e: Error) => setExportError(e.message));

    return (
        <>
            <Typography variant="h5" component="h1" gutterBottom>
                {title}
            </Typography>
            {children}
            <Paper sx={{p: 2}}>
                <Stack direction="row" sx={{gap: 2, mb: 1, alignItems: 'center'}}>
                    <TextField
                        label="Search"
                        type="search"
                        size="small"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{flexGrow: 1, maxWidth: 360}}
                    />
                    {exportRows && (
                        <Button size="small" onClick={exportCsv}>
                            Export CSV
                        </Button>
                    )}
                </Stack>
                {(query.isPending || query.isFetching) && <LinearProgress/>}
                {query.error && <Alert severity="error">{query.error.message}</Alert>}
                {exportError && <Alert severity="error">{exportError}</Alert>}
                <DataTable
                    columns={columns}
                    rows={query.data?.items ?? []}
                    actions={actions}
                    paging={{
                        total: query.data?.total ?? 0,
                        ...paging,
                        onChange: (page, perPage) => setPaging({page, perPage}),
                    }}
                />
            </Paper>
        </>
    );
}
