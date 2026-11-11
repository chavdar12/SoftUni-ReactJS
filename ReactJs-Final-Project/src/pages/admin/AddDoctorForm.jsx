import {Button, Paper, Stack, TextField, Typography} from '@mui/material';
import {createDoctor} from '../../api';
import useSubmit from '../../useSubmit';
import FormStatus from '../../components/FormStatus';

export const SPECIALIZATIONS = ['General', 'Cardiologist', 'Gynaecologist', 'Dermatologist', 'Pediatrician', 'Neurologist'];

async function addDoctor(values, form) {
    if (values.password !== values.confirm) throw new Error('Passwords do not match');
    await createDoctor({...values, roomNumber: Number(values.roomNumber)});
    form.reset();
}

export default function AddDoctorForm() {
    const {onSubmit, busy, error, message} = useSubmit(addDoctor, 'Doctor account created.');

    return (
        <Paper sx={{p: 2, mb: 3}}>
            <Typography variant="h6" component="h2" gutterBottom>
                Add a doctor
            </Typography>
            <Stack component="form" onSubmit={onSubmit} sx={{gap: 2}}>
                <FormStatus error={error} message={message}/>
                <Stack direction={{xs: 'column', sm: 'row'}} sx={{gap: 2}}>
                    <TextField label="Name" name="name" required fullWidth/>
                    <TextField
                        label="Specialization"
                        name="specialization"
                        select
                        required
                        fullWidth
                        defaultValue=""
                        slotProps={{select: {native: true}, inputLabel: {shrink: true}}}
                    >
                        <option value="" disabled/>
                        {SPECIALIZATIONS.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </TextField>
                    <TextField label="Room" name="roomNumber" type="number" required fullWidth
                               slotProps={{htmlInput: {min: 1}}}/>
                </Stack>
                <Stack direction={{xs: 'column', sm: 'row'}} sx={{gap: 2}}>
                    <TextField label="Email" name="email" type="email" required fullWidth/>
                    <TextField label="Password" name="password" type="password" autoComplete="new-password" required
                               fullWidth slotProps={{htmlInput: {minLength: 6}}}/>
                    <TextField label="Confirm password" name="confirm" type="password" autoComplete="new-password"
                               required fullWidth/>
                </Stack>
                <Button type="submit" variant="contained" disabled={busy} sx={{alignSelf: 'start'}}>
                    {busy ? 'Adding…' : 'Add doctor'}
                </Button>
            </Stack>
        </Paper>
    );
}
