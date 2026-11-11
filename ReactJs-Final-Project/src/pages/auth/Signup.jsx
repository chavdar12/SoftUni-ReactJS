import {Link, Navigate} from 'react-router';
import {Button, Link as MuiLink, Stack, TextField} from '@mui/material';
import {useAuth} from '../../auth/AuthProvider';
import {homeFor} from '../../auth/RequireRole';
import {signUpPatient} from '../../api';
import useSubmit from '../../useSubmit';
import AuthCard from '../../components/AuthCard';
import FormStatus from '../../components/FormStatus';

const signUp = (values) => {
    if (values.password !== values.confirm) throw new Error('Passwords do not match');
    return signUpPatient(values);
};

export default function Signup() {
    const {profile} = useAuth();
    const {onSubmit, busy, error} = useSubmit(signUp);

    if (profile) return <Navigate to={homeFor(profile.role)} replace/>;

    return (
        <AuthCard title="Create a patient account">
            <Stack component="form" onSubmit={onSubmit} sx={{gap: 2, mt: 1}}>
                <FormStatus error={error}/>
                <TextField label="Full name" name="name" autoComplete="name" required autoFocus/>
                <TextField label="Email" name="email" type="email" autoComplete="email" required/>
                <TextField label="Phone" name="phone" type="tel" autoComplete="tel" required
                           slotProps={{htmlInput: {minLength: 6}}}/>
                <TextField label="Password" name="password" type="password" autoComplete="new-password" required
                           slotProps={{htmlInput: {minLength: 6}}}/>
                <TextField label="Confirm password" name="confirm" type="password" autoComplete="new-password"
                           required/>
                <Button type="submit" variant="contained" disabled={busy}>
                    {busy ? 'Creating…' : 'Sign up'}
                </Button>
                <MuiLink component={Link} to="/login">
                    Already have an account? Sign in
                </MuiLink>
            </Stack>
        </AuthCard>
    );
}
