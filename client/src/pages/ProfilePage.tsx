import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Button, Paper, Stack, TextField, Typography} from '@mui/material';
import {z} from 'zod';
import {useChangePassword, useLogoutEverywhere, useUpdateProfile} from '@/api/hooks';
import type {User} from '@/api/types';
import {useAuth} from '@/auth/useAuth';
import useZodForm from '@/useZodForm';
import FormStatus from '@/components/FormStatus';
import ConfirmButton from '@/components/ConfirmButton';
import WorkingHoursFields, {DEFAULT_HOURS} from '@/components/WorkingHoursFields';
import PhoneField from '@/components/PhoneField';
import {E164} from '@/lib/phone';

const profileSchema = z.object({
    name: z.string().trim().min(1, 'Required').max(100),
    phone: z.string('Enter your phone number').regex(E164, 'Enter a valid phone number'),
});

const passwordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Required'),
        newPassword: z.string().min(6, 'At least 6 characters'),
        confirm: z.string(),
    })
    .refine((v) => v.newPassword === v.confirm, {message: 'Passwords do not match', path: ['confirm']});

function ProfileForm({user}: {user: User}) {
    const update = useUpdateProfile();
    const [hours, setHours] = useState(user.workingHours ?? DEFAULT_HOURS);
    const isDoctor = user.role === 'doctor';
    const {handleSubmit, field, setValue, formState} = useZodForm(profileSchema);
    // The phone picker isn't a registered input, so seed the form with the saved number.
    useEffect(() => setValue('phone', user.phone ?? ''), [setValue, user.phone]);
    const onSubmit = handleSubmit((v) => update.mutate(isDoctor ? {...v, workingHours: hours} : v));

    return (
        <Paper sx={{p: 2}}>
            <Typography variant="h6" component="h2" gutterBottom>
                Profile
            </Typography>
            <Stack component="form" noValidate onSubmit={onSubmit} sx={{gap: 2}}>
                <FormStatus error={update.error?.message} message={update.isSuccess ? 'Profile saved.' : ''}/>
                <TextField label="Email" value={user.email} disabled/>
                <TextField label="Name" required defaultValue={user.name} {...field('name')}/>
                <PhoneField
                    required
                    defaultValue={user.phone}
                    onChange={(v) => setValue('phone', v, {shouldValidate: formState.isSubmitted})}
                    error={formState.errors.phone?.message}
                />
                {isDoctor && <WorkingHoursFields value={hours} onChange={setHours}/>}
                <Button
                    type="submit"
                    variant="contained"
                    disabled={update.isPending || (isDoctor && (!hours.days.length || hours.start >= hours.end))}
                    sx={{alignSelf: 'start'}}
                >
                    Save
                </Button>
            </Stack>
        </Paper>
    );
}

function PasswordForm() {
    const change = useChangePassword();
    const {handleSubmit, field, reset} = useZodForm(passwordSchema);
    const onSubmit = handleSubmit(({confirm: _, ...v}) => change.mutate(v, {onSuccess: () => reset()}));

    return (
        <Paper sx={{p: 2}}>
            <Typography variant="h6" component="h2" gutterBottom>
                Change password
            </Typography>
            <Stack component="form" noValidate onSubmit={onSubmit} sx={{gap: 2}}>
                <FormStatus
                    error={change.error?.message}
                    message={change.isSuccess ? 'Password changed. Other devices were signed out.' : ''}
                />
                <TextField label="Current password" type="password" autoComplete="current-password" required {...field('currentPassword')}/>
                <TextField label="New password" type="password" autoComplete="new-password" required {...field('newPassword')}/>
                <TextField label="Confirm new password" type="password" autoComplete="new-password" required {...field('confirm')}/>
                <Button type="submit" variant="contained" disabled={change.isPending} sx={{alignSelf: 'start'}}>
                    Change password
                </Button>
            </Stack>
        </Paper>
    );
}

export default function ProfilePage() {
    const {profile} = useAuth();
    const logoutEverywhere = useLogoutEverywhere();
    if (!profile) return null;

    return (
        <Stack sx={{gap: 3, maxWidth: 560}}>
            <Typography variant="h5" component="h1">
                My account
            </Typography>
            <Button component={Link} to={`/${profile.role}/security`} variant="outlined" sx={{alignSelf: 'start'}}>
                Security: verification, two-step sign-in, passkeys
            </Button>
            <ProfileForm user={profile}/>
            <PasswordForm/>
            <Paper sx={{p: 2}}>
                <Typography variant="h6" component="h2" gutterBottom>
                    Sessions
                </Typography>
                <FormStatus error={logoutEverywhere.error?.message}/>
                <ConfirmButton color="error" question="Sign out on every device, including this one?" onConfirm={() => logoutEverywhere.mutate()}>
                    Log out everywhere
                </ConfirmButton>
            </Paper>
        </Stack>
    );
}
