import {Alert} from '@mui/material';

export default function FormStatus({error, message}: {error?: string; message?: string}) {
    if (error) return <Alert severity="error">{error}</Alert>;
    if (message) return <Alert severity="success">{message}</Alert>;
    return null;
}
