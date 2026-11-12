import {Link, Navigate} from 'react-router';
import {Button, Link as MuiLink, Stack, TextField} from '@mui/material';
import {z} from 'zod';
import {useAuth} from '../../auth/useAuth';
import {homeFor} from '../../auth/RequireRole';
import {useLogin} from '../../api/hooks';
import useZodForm from '../../useZodForm';
import AuthCard from '../../components/AuthCard';
import FormStatus from '../../components/FormStatus';

const schema = z.object({
    email: z.email('Enter a valid email'),
    password: z.string().min(1, 'Required'),
});

export default function Login() {
    const {profile} = useAuth();
    const login = useLogin();
    const {handleSubmit, field} = useZodForm(schema);

    if (profile) return <Navigate to={homeFor(profile.role)} replace/>;

    return (
        <AuthCard title="Sign in">
            <Stack component="form" noValidate onSubmit={handleSubmit((v) => login.mutate(v))} sx={{gap: 2, mt: 1}}>
                <FormStatus error={login.error?.message}/>
                <TextField label="Email" type="email" autoComplete="email" required autoFocus {...field('email')}/>
                <TextField label="Password" type="password" autoComplete="current-password" required {...field('password')}/>
                <Button type="submit" variant="contained" disabled={login.isPending}>
                    {login.isPending ? 'Signing in…' : 'Sign in'}
                </Button>
                <MuiLink component={Link} to="/signup" sx={{alignSelf: 'end'}}>
                    Create an account
                </MuiLink>
            </Stack>
        </AuthCard>
    );
}
