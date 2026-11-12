import {Link, useSearchParams} from 'react-router';
import {Button, Link as MuiLink, Stack, TextField} from '@mui/material';
import {z} from 'zod';
import {useResetPassword} from '@/api/hooks';
import useZodForm from '@/useZodForm';
import AuthCard from '@/components/AuthCard';
import FormStatus from '@/components/FormStatus';

const schema = z
    .object({password: z.string().min(6, 'At least 6 characters'), confirm: z.string()})
    .refine((v) => v.password === v.confirm, {message: 'Passwords do not match', path: ['confirm']});

export default function ResetPassword() {
    const token = useSearchParams()[0].get('token') ?? '';
    const reset = useResetPassword();
    const {handleSubmit, field} = useZodForm(schema);

    return (
        <AuthCard title="Choose a new password">
            <Stack
                component="form"
                noValidate
                onSubmit={handleSubmit(({password}) => reset.mutate({token, password}))}
                sx={{gap: 2, mt: 1}}
            >
                <FormStatus
                    error={token ? reset.error?.message : 'This reset link is incomplete.'}
                    message={reset.isSuccess ? 'Password changed. You can sign in now.' : ''}
                />
                <TextField label="New password" type="password" autoComplete="new-password" required autoFocus {...field('password')}/>
                <TextField label="Confirm password" type="password" autoComplete="new-password" required {...field('confirm')}/>
                <Button type="submit" variant="contained" disabled={!token || reset.isPending || reset.isSuccess}>
                    Set password
                </Button>
                <MuiLink component={Link} to="/login">
                    Sign in
                </MuiLink>
            </Stack>
        </AuthCard>
    );
}
