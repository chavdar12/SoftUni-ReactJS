import {type ReactNode, useEffect, useState} from 'react';
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress,
    List, ListItem, ListItemText, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import {browserSupportsWebAuthn} from '@simplewebauthn/browser';
import QRCode from 'qrcode';
import {
    useAddPasskey, useConfirmTotp, useDeletePasskey, useEmailCodeLogin, useRemoveTotp, useRenamePasskey, useSecurity,
    useSendEmailCode, useSendPhoneCode, useStartTotp, useVerifyEmail, useVerifyPhone,
} from '@/api/hooks';
import type {Passkey} from '@/api/types';
import FormStatus from '@/components/FormStatus';
import CodeField from '@/components/CodeField';
import ConfirmButton from '@/components/ConfirmButton';
import {formatDateTime} from '@/lib/dates';

function Section({title, status, children}: {title: string; status?: ReactNode; children: ReactNode}) {
    return (
        <Paper sx={{p: 2}}>
            <Stack direction="row" sx={{alignItems: 'center', gap: 1, mb: 1}}>
                <Typography variant="h6" component="h2">
                    {title}
                </Typography>
                {status}
            </Stack>
            {children}
        </Paper>
    );
}

const Verified = ({ok}: {ok: boolean}) => (
    <Chip size="small" color={ok ? 'success' : 'warning'} label={ok ? 'Verified' : 'Not verified'}/>
);

/** "Send code" then "enter code", for email or phone. */
function VerifyWithCode({send, verify, sentTo}: {
    send: ReturnType<typeof useSendEmailCode>;
    verify: ReturnType<typeof useVerifyEmail>;
    sentTo: string;
}) {
    const [code, setCode] = useState('');
    return (
        <Stack
            component="form"
            sx={{gap: 1, maxWidth: 360}}
            onSubmit={(e) => {
                e.preventDefault();
                verify.mutate(code);
            }}
        >
            <FormStatus error={send.error?.message ?? verify.error?.message} message={send.isSuccess ? `Code sent to ${sentTo}.` : ''}/>
            <Button onClick={() => send.mutate()} disabled={send.isPending} sx={{alignSelf: 'start'}}>
                {send.isSuccess ? 'Send a new code' : 'Send code'}
            </Button>
            {send.isSuccess && (
                <>
                    <CodeField value={code} onChange={(e) => setCode(e.target.value.trim())} size="small"/>
                    <Button type="submit" variant="contained" disabled={code.length !== 6 || verify.isPending} sx={{alignSelf: 'start'}}>
                        Verify
                    </Button>
                </>
            )}
        </Stack>
    );
}

function AuthenticatorSection({enabled}: {enabled: boolean}) {
    const start = useStartTotp();
    const confirm = useConfirmTotp();
    const remove = useRemoveTotp();
    const [qr, setQr] = useState('');
    const [code, setCode] = useState('');
    const [removing, setRemoving] = useState(false);
    const setup = !enabled && start.data;

    useEffect(() => {
        if (start.data) void QRCode.toDataURL(start.data.otpauthUrl, {margin: 1, width: 200}).then(setQr);
    }, [start.data]);

    return (
        <Section title="Authenticator app" status={<Chip size="small" color={enabled ? 'success' : 'default'} label={enabled ? 'On' : 'Off'}/>}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                One authenticator per account (Google Authenticator, Microsoft Authenticator, 1Password, …). When it's on,
                signing in with a password also asks for its code.
            </Typography>
            {enabled && !removing && (
                <Button color="error" onClick={() => setRemoving(true)}>
                    Remove authenticator
                </Button>
            )}
            {(removing || setup) && (
                <Stack
                    component="form"
                    sx={{gap: 1, maxWidth: 360}}
                    onSubmit={(e) => {
                        e.preventDefault();
                        const done = {onSuccess: () => {setCode(''); setRemoving(false); start.reset();}};
                        if (removing) remove.mutate(code, done);
                        else confirm.mutate(code, done);
                    }}
                >
                    {setup && (
                        <>
                            <Typography variant="body2">Scan this with your app, or enter the key by hand:</Typography>
                            {qr && <Box component="img" src={qr} alt="QR code for your authenticator app" sx={{width: 200, height: 200}}/>}
                            <Typography variant="body2" sx={{fontFamily: 'monospace', wordBreak: 'break-all'}}>
                                {setup.secret.match(/.{1,4}/g)?.join(' ')}
                            </Typography>
                        </>
                    )}
                    {removing && <Typography variant="body2">Enter a current code from the app to remove it.</Typography>}
                    <FormStatus error={(removing ? remove : confirm).error?.message}/>
                    <CodeField value={code} onChange={(e) => setCode(e.target.value.trim())} size="small" autoFocus/>
                    <Stack direction="row" sx={{gap: 1}}>
                        <Button type="submit" variant="contained" color={removing ? 'error' : 'primary'} disabled={code.length !== 6}>
                            {removing ? 'Remove' : 'Turn on'}
                        </Button>
                        <Button onClick={() => {setRemoving(false); start.reset(); setCode('');}}>Cancel</Button>
                    </Stack>
                </Stack>
            )}
            {!enabled && !setup && (
                <>
                    <FormStatus error={start.error?.message}/>
                    <Button variant="contained" onClick={() => start.mutate()} disabled={start.isPending}>
                        Set up authenticator
                    </Button>
                </>
            )}
        </Section>
    );
}

function PasskeyRow({passkey}: {passkey: Passkey}) {
    const rename = useRenamePasskey();
    const remove = useDeletePasskey();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(passkey.name);
    const onError = (e: Error) => alert(e.message);

    return (
        <ListItem
            disableGutters
            secondaryAction={
                <>
                    <Button size="small" onClick={() => setEditing(true)}>
                        Rename
                    </Button>
                    <ConfirmButton
                        size="small"
                        color="error"
                        question={`Remove the passkey "${passkey.name}"? Also delete it from the device's password manager.`}
                        onConfirm={() => remove.mutate(passkey.id, {onError})}
                    >
                        Remove
                    </ConfirmButton>
                </>
            }
        >
            <ListItemText
                primary={passkey.name}
                secondary={`Added ${formatDateTime(passkey.createdAt)} · ${passkey.lastUsedAt ? `last used ${formatDateTime(passkey.lastUsedAt)}` : 'never used'}`}
            />
            <Dialog open={editing} onClose={() => setEditing(false)}>
                <DialogTitle>Rename passkey</DialogTitle>
                <DialogContent>
                    <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} slotProps={{htmlInput: {maxLength: 60}}} sx={{mt: 1}} autoFocus/>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditing(false)}>Cancel</Button>
                    <Button
                        disabled={!name.trim()}
                        onClick={() => rename.mutate({id: passkey.id, name: name.trim()}, {onSuccess: () => setEditing(false), onError})}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </ListItem>
    );
}

function PasskeysSection({passkeys}: {passkeys: Passkey[]}) {
    const add = useAddPasskey();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const supported = browserSupportsWebAuthn();

    return (
        <Section title="Passkeys" status={<Chip size="small" label={passkeys.length}/>}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Sign in with your fingerprint, face or device PIN instead of a password. Add one per device or security key.
            </Typography>
            <List dense>
                {passkeys.map((p) => (
                    <PasskeyRow key={p.id} passkey={p}/>
                ))}
            </List>
            {supported ? (
                <Stack
                    component="form"
                    direction={{xs: 'column', sm: 'row'}}
                    sx={{gap: 1, alignItems: {sm: 'center'}}}
                    onSubmit={(e) => {
                        e.preventDefault();
                        add.mutate({name: name.trim(), password}, {
                            onSuccess: () => setName(''),
                            onSettled: () => setPassword(''), // never keep it around
                        });
                    }}
                >
                    <TextField
                        label="Name for the new passkey"
                        placeholder="e.g. My laptop"
                        size="small"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        slotProps={{htmlInput: {maxLength: 60}}}
                    />
                    <TextField
                        label="Your password"
                        type="password"
                        autoComplete="current-password"
                        size="small"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" variant="contained" disabled={!name.trim() || !password || add.isPending}>
                        Add passkey
                    </Button>
                </Stack>
            ) : (
                <Alert severity="info">This browser doesn't support passkeys.</Alert>
            )}
            <FormStatus error={add.error?.message}/>
        </Section>
    );
}

export default function SecurityPage() {
    const security = useSecurity();
    const sendEmail = useSendEmailCode();
    const verifyEmail = useVerifyEmail();
    const sendPhone = useSendPhoneCode();
    const verifyPhone = useVerifyPhone();
    const emailLogin = useEmailCodeLogin();
    const s = security.data;

    return (
        <Stack sx={{gap: 3, maxWidth: 640}}>
            <Typography variant="h5" component="h1">
                Security
            </Typography>
            {security.isPending && <LinearProgress/>}
            {security.error && <Alert severity="error">{security.error.message}</Alert>}
            {s && (
                <>
                    <Section title="Email" status={<Verified ok={s.emailVerified}/>}>
                        <Typography gutterBottom>{s.email}</Typography>
                        {!s.emailVerified && <VerifyWithCode send={sendEmail} verify={verifyEmail} sentTo={s.email}/>}
                    </Section>
                    <Section title="Phone" status={s.phone && <Verified ok={s.phoneVerified}/>}>
                        <Typography gutterBottom>{s.phone ?? 'No phone number. Add one on your profile.'}</Typography>
                        {s.phone && !s.phoneVerified && (
                            <VerifyWithCode send={sendPhone} verify={verifyPhone} sentTo={`${s.phone} (by SMS)`}/>
                        )}
                    </Section>
                    <AuthenticatorSection enabled={s.totpEnabled}/>
                    <Section title="Email codes at sign-in">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={s.emailCodeLogin}
                                    disabled={!s.emailVerified || emailLogin.isPending}
                                    onChange={(e) => emailLogin.mutate(e.target.checked)}
                                />
                            }
                            label="Ask for a code sent to my email after my password"
                        />
                        <Typography variant="body2" color="text.secondary">
                            {s.emailVerified
                                ? 'With an authenticator on, email codes are also offered as a backup.'
                                : 'Verify your email to use this.'}
                        </Typography>
                        <FormStatus error={emailLogin.error?.message}/>
                    </Section>
                    <PasskeysSection passkeys={s.passkeys}/>
                </>
            )}
        </Stack>
    );
}
