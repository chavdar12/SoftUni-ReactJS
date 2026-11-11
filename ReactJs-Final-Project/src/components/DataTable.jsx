import {useState} from 'react';
import {Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow} from '@mui/material';

/**
 * columns: [{ id, label, format?(value, row) }]
 * actions?: (row) => node, rendered in a trailing "Actions" column.
 */
export default function DataTable({columns, rows, actions}) {
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const visible = rows.slice(page * perPage, (page + 1) * perPage);
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
                                    <TableCell key={c.id}>{c.format ? c.format(row[c.id], row) : row[c.id]}</TableCell>
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
                count={rows.length}
                page={page}
                rowsPerPage={perPage}
                rowsPerPageOptions={[5, 10, 25]}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => {
                    setPerPage(+e.target.value);
                    setPage(0);
                }}
            />
        </>
    );
}
