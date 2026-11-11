import {Link} from 'react-router';
import {Button, Link as MuiLink, Stack, TextField} from '@mui/material';
import {resetPassword} from '../../api';
import useSubmit from '../../useSubmit';
import AuthCard from '../../components/AuthCard';
import FormStatus from '../../components/FormStatus';

export default function ForgotPassword() {
    const {onSubmit, busy, error, message} = useSubmit(resetPassword, 'Check your inbox for a reset link.');

    return (
        <AuthCard title="Reset password">
            <Stack component="form" onSubmit={onSubmit} sx={{gap: 2, mt: 1}}>
                <FormStatus error={error} message={message}/>
                <TextField label="Email" name="email" type="email" autoComplete="email" required autoFocus/>
                <Button type="submit" variant="contained" disabled={busy}>
                    Send reset link
                </Button>
                <MuiLink component={Link} to="/login">
                    Back to sign in
                </MuiLink>
            </Stack>
        </AuthCard>
    );
}
