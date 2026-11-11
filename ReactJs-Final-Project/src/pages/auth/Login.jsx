import {Link, Navigate} from 'react-router';
import {Alert, Button, Link as MuiLink, Stack, TextField} from '@mui/material';
import {useAuth} from '../../auth/AuthProvider';
import {homeFor} from '../../auth/RequireRole';
import {login, logout} from '../../api';
import useSubmit from '../../useSubmit';
import AuthCard from '../../components/AuthCard';
import FormStatus from '../../components/FormStatus';

export default function Login() {
    const {user, profile} = useAuth();
    const {onSubmit, busy, error} = useSubmit(login);

    if (profile) return <Navigate to={homeFor(profile.role)} replace/>;

    return (
        <AuthCard title="Sign in">
            {user && (
                <Alert severity="warning" action={<Button onClick={logout}>Log out</Button>}>
                    This account has no profile. Ask an administrator.
                </Alert>
            )}
            <Stack component="form" onSubmit={onSubmit} sx={{gap: 2, mt: 1}}>
                <FormStatus error={error}/>
                <TextField label="Email" name="email" type="email" autoComplete="email" required autoFocus/>
                <TextField label="Password" name="password" type="password" autoComplete="current-password" required/>
                <Button type="submit" variant="contained" disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'}
                </Button>
                <Stack direction="row" sx={{justifyContent: 'space-between'}}>
                    <MuiLink component={Link} to="/forgot-password">
                        Forgot password?
                    </MuiLink>
                    <MuiLink component={Link} to="/signup">
                        Create an account
                    </MuiLink>
                </Stack>
            </Stack>
        </AuthCard>
    );
}
