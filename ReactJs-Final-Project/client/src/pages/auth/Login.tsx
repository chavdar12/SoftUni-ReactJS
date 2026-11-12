import {useState} from 'react';
import {Link, Navigate} from 'react-router';
import {Button, Divider, Link as MuiLink, Stack, Tab, Tabs, TextField, Typography} from '@mui/material';
import {browserSupportsWebAuthn} from '@simplewebauthn/browser';
import {z} from 'zod';
import {useAuth} from '@/auth/useAuth';
import {homeFor} from '@/auth/RequireRole';
import {useLogin, usePasskeyLogin, useSendLoginCode, useVerifyMfa} from '@/api/hooks';
import type {MfaMethod} from '@/api/types';
import useZodForm from '@/useZodForm';
import AuthCard from '@/components/AuthCard';
import FormStatus from '@/components/FormStatus';
import CodeField from '@/components/CodeField';

const schema = z.object({
    email: z.email('Enter a valid email'),
    password: z.string().min(1, 'Required'),
});

const METHOD_LABELS: Record<MfaMethod, string> = {totp: 'Authenticator app', email: 'Email code'};

/** The second step: a code from the authenticator app, or one sent by email. */
function SecondStep({mfaToken, methods, onBack}: {mfaToken: string; methods: MfaMethod[]; onBack: () => void}) {
    const [method, setMethod] = useState(methods[0]);
    const [code, setCode] = useState('');
    const verify = useVerifyMfa();
    const send = useSendLoginCode();

    return (
        <Stack
            component="form"
            onSubmit={(e) => {
                e.preventDefault();
                verify.mutate({mfaToken, method, code});
            }}
            sx={{gap: 2, mt: 1}}
        >
            <Typography>Two-step verification is on for this account.</Typography>
            {methods.length > 1 && (
                <Tabs value={method} onChange={(_, m: MfaMethod) => setMethod(m)}>
                    {methods.map((m) => (
                        <Tab key={m} value={m} label={METHOD_LABELS[m]}/>
                    ))}
                </Tabs>
            )}
            <FormStatus
                error={verify.error?.message ?? send.error?.message}
                message={send.isSuccess && method === 'email' ? 'Code sent. Check your email.' : ''}
            />
            {method === 'totp' ? (
                <Typography variant="body2">Enter the code shown in your authenticator app.</Typography>
            ) : (
                <Button onClick={() => send.mutate(mfaToken)} disabled={send.isPending} sx={{alignSelf: 'start'}}>
                    {send.isSuccess ? 'Send a new code' : 'Email me a code'}
                </Button>
            )}
            <CodeField value={code} onChange={(e) => setCode(e.target.value.trim())} autoFocus required/>
            <Button type="submit" variant="contained" disabled={verify.isPending || code.length !== 6}>
                Verify
            </Button>
            <MuiLink component="button" type="button" onClick={onBack} sx={{alignSelf: 'start'}}>
                Use a different account
            </MuiLink>
        </Stack>
    );
}

export default function Login() {
    const {profile} = useAuth();
    const login = useLogin();
    const passkey = usePasskeyLogin();
    const {handleSubmit, field} = useZodForm(schema);
    const pending = login.data && 'mfaRequired' in login.data ? login.data : null;

    if (profile) return <Navigate to={homeFor(profile.role)} replace/>;

    if (pending) {
        return (
            <AuthCard title="Verify it's you">
                <SecondStep mfaToken={pending.mfaToken} methods={pending.methods} onBack={() => login.reset()}/>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="Sign in">
            <Stack component="form" noValidate onSubmit={handleSubmit((v) => login.mutate(v))} sx={{gap: 2, mt: 1}}>
                <FormStatus error={login.error?.message ?? passkey.error?.message}/>
                <TextField label="Email" type="email" autoComplete="username webauthn" required autoFocus {...field('email')}/>
                <TextField label="Password" type="password" autoComplete="current-password" required {...field('password')}/>
                <Button type="submit" variant="contained" disabled={login.isPending}>
                    {login.isPending ? 'Signing in…' : 'Sign in'}
                </Button>
                {browserSupportsWebAuthn() && (
                    <>
                        <Divider>or</Divider>
                        <Button variant="outlined" onClick={() => passkey.mutate()} disabled={passkey.isPending}>
                            Sign in with a passkey
                        </Button>
                    </>
                )}
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
