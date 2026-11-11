import {Alert, LinearProgress, Paper, Typography} from '@mui/material';
import useCollection from '../useCollection';
import DataTable from './DataTable';

/** A titled, live table of `collection` (optionally filtered by `field == value`). */
export default function ListPage({title, collection, field, value, columns, actions, children}) {
    const {rows, loading, error} = useCollection(collection, field, value);

    return (
        <>
            <Typography variant="h5" component="h1" gutterBottom>
                {title}
            </Typography>
            {children}
            <Paper sx={{p: 2}}>
                {loading && <LinearProgress/>}
                {error && <Alert severity="error">{error}</Alert>}
                <DataTable columns={columns} rows={rows} actions={actions}/>
            </Paper>
        </>
    );
}
