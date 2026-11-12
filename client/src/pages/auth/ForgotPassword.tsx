import {Link} from 'react-router';
import {Button, Link as MuiLink, Stack, TextField} from '@mui/material';
import {z} from 'zod';
import {useForgotPassword} from '@/api/hooks';
import useZodForm from '@/useZodForm';
import AuthCard from '@/components/AuthCard';
import FormStatus from '@/components/FormStatus';

const schema = z.object({email: z.email('Enter a valid email')});

export default function ForgotPassword() {
    const forgot = useForgotPassword();
    const {handleSubmit, field} = useZodForm(schema);

    return (
        <AuthCard title="Reset your password">
            <Stack component="form" noValidate onSubmit={handleSubmit((v) => forgot.mutate(v))} sx={{gap: 2, mt: 1}}>
                <FormStatus
                    error={forgot.error?.message}
                    message={forgot.isSuccess ? 'If that email has an account, a reset link is on its way.' : ''}
                />
                <TextField label="Email" type="email" autoComplete="email" required autoFocus {...field('email')}/>
                <Button type="submit" variant="contained" disabled={forgot.isPending}>
                    Send reset link
                </Button>
                <MuiLink component={Link} to="/login">
                    Back to sign in
                </MuiLink>
            </Stack>
        </AuthCard>
    );
}
