import {type ReactNode, useState} from 'react';
import {Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow} from '@mui/material';

export interface Column<T> {
    id: keyof T & string;
    label: string;
    format?: (value: T[keyof T], row: T) => ReactNode;
}

interface Props<T> {
    columns: Column<T>[];
    rows: T[];
    /** Rendered in a trailing "Actions" column. */
    actions?: (row: T) => ReactNode;
    /** Server paging: `rows` is already one page of `total`; the parent owns page/perPage. */
    paging?: {total: number; page: number; perPage: number; onChange: (page: number, perPage: number) => void};
}

export default function DataTable<T extends {id: string}>({columns, rows, actions, paging}: Props<T>) {
    const [own, setOwn] = useState({page: 0, perPage: 10});
    const {page, perPage} = paging ?? own;
    const onChange = paging?.onChange ?? ((p: number, pp: number) => setOwn({page: p, perPage: pp}));
    const visible = paging ? rows : rows.slice(page * perPage, (page + 1) * perPage);
    const span = columns.length + (actions ? 1 : 0);

    return (
        <>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {columns.map((c) => (
                                <TableCell key={c.id}>{c.label}</TableCell>
                            ))}
                            {actions && <TableCell>Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visible.map((row) => (
                            <TableRow hover key={row.id}>
                                {columns.map((c) => (
                                    <TableCell key={c.id}>{c.format ? c.format(row[c.id], row) : (row[c.id] as ReactNode)}</TableCell>
                                ))}
                                {actions && <TableCell>{actions(row)}</TableCell>}
                            </TableRow>
                        ))}
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={span} align="center">
                                    No records
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={paging?.total ?? rows.length}
                page={page}
                rowsPerPage={perPage}
                rowsPerPageOptions={[5, 10, 25]}
                onPageChange={(_, p) => onChange(p, perPage)}
                onRowsPerPageChange={(e) => onChange(0, +e.target.value)}
            />
        </>
    );
}
