import {Link, Navigate} from 'react-router';
import {Button, Link as MuiLink, Stack, TextField} from '@mui/material';
import {z} from 'zod';
import {useAuth} from '@/auth/useAuth';
import {homeFor} from '@/auth/RequireRole';
import {useSignup} from '@/api/hooks';
import useZodForm from '@/useZodForm';
import AuthCard from '@/components/AuthCard';
import FormStatus from '@/components/FormStatus';
import PhoneField from '@/components/PhoneField';
import {E164} from '@/lib/phone';

const schema = z
    .object({
        name: z.string().trim().min(1, 'Required'),
        email: z.email('Enter a valid email'),
        phone: z.string('Enter your phone number').regex(E164, 'Enter a valid phone number'),
        password: z.string().min(6, 'At least 6 characters'),
        confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {message: 'Passwords do not match', path: ['confirm']});

export default function Signup() {
    const {profile} = useAuth();
    const signup = useSignup();
    const {handleSubmit, field, setValue, formState} = useZodForm(schema);

    if (profile) return <Navigate to={homeFor(profile.role)} replace/>;

    return (
        <AuthCard title="Create a patient account">
            <Stack
                component="form"
                noValidate
                onSubmit={handleSubmit(({confirm: _, ...v}) => signup.mutate(v))}
                sx={{gap: 2, mt: 1}}
            >
                <FormStatus error={signup.error?.message}/>
                <TextField label="Full name" autoComplete="name" required autoFocus {...field('name')}/>
                <TextField label="Email" type="email" autoComplete="email" required {...field('email')}/>
                <PhoneField
                    required
                    onChange={(v) => setValue('phone', v, {shouldValidate: formState.isSubmitted})}
                    error={formState.errors.phone?.message}
                />
                <TextField label="Password" type="password" autoComplete="new-password" required {...field('password')}/>
                <TextField label="Confirm password" type="password" autoComplete="new-password" required {...field('confirm')}/>
                <Button type="submit" variant="contained" disabled={signup.isPending}>
                    {signup.isPending ? 'Creating…' : 'Sign up'}
                </Button>
                <MuiLink component={Link} to="/login">
                    Already have an account? Sign in
                </MuiLink>
            </Stack>
        </AuthCard>
    );
}
