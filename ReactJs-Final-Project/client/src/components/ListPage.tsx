import type {ReactNode} from 'react';
import {Alert, LinearProgress, Paper, Typography} from '@mui/material';
import type {UseQueryResult} from '@tanstack/react-query';
import DataTable, {type Column} from './DataTable';

interface Props<T> {
    title: string;
    query: UseQueryResult<T[]>;
    columns: Column<T>[];
    actions?: (row: T) => ReactNode;
    children?: ReactNode;
}

/** A titled table of a list query's rows, with its loading and error states. */
export default function ListPage<T extends {id: string}>({title, query, columns, actions, children}: Props<T>) {
    return (
        <>
            <Typography variant="h5" component="h1" gutterBottom>
                {title}
            </Typography>
            {children}
            <Paper sx={{p: 2}}>
                {query.isPending && <LinearProgress/>}
                {query.error && <Alert severity="error">{query.error.message}</Alert>}
                <DataTable columns={columns} rows={query.data ?? []} actions={actions}/>
            </Paper>
        </>
    );
}
