import {Button, Paper, Stack, TextField, Typography} from '@mui/material';
import {z} from 'zod';
import {useCreateDoctor} from '../../api/hooks';
import useZodForm from '../../useZodForm';
import FormStatus from '../../components/FormStatus';

const SPECIALIZATIONS = ['General', 'Cardiologist', 'Gynaecologist', 'Dermatologist', 'Pediatrician', 'Neurologist'];

const schema = z
    .object({
        name: z.string().trim().min(1, 'Required'),
        specialization: z.enum(SPECIALIZATIONS, 'Pick one'),
        roomNumber: z.coerce.number<string>().int().min(1, 'Room 1 or higher'),
        email: z.email('Enter a valid email'),
        password: z.string().min(6, 'At least 6 characters'),
        confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {message: 'Passwords do not match', path: ['confirm']});

const nativeSelect = {select: {native: true}, inputLabel: {shrink: true}};

export default function AddDoctorForm() {
    const createDoctor = useCreateDoctor();
    const {handleSubmit, field, reset} = useZodForm(schema);
    const onSubmit = handleSubmit(({confirm: _, ...doctor}) => createDoctor.mutate(doctor, {onSuccess: () => reset()}));

    return (
        <Paper sx={{p: 2, mb: 3}}>
            <Typography variant="h6" component="h2" gutterBottom>
                Add a doctor
            </Typography>
            <Stack component="form" noValidate onSubmit={onSubmit} sx={{gap: 2}}>
                <FormStatus error={createDoctor.error?.message} message={createDoctor.isSuccess ? 'Doctor account created.' : ''}/>
                <Stack direction={{xs: 'column', sm: 'row'}} sx={{gap: 2}}>
                    <TextField label="Name" required fullWidth {...field('name')}/>
                    <TextField label="Specialization" select required fullWidth defaultValue="" slotProps={nativeSelect} {...field('specialization')}>
                        <option value="" disabled/>
                        {SPECIALIZATIONS.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </TextField>
                    <TextField label="Room" type="number" required fullWidth {...field('roomNumber')}/>
                </Stack>
                <Stack direction={{xs: 'column', sm: 'row'}} sx={{gap: 2}}>
                    <TextField label="Email" type="email" required fullWidth {...field('email')}/>
                    <TextField label="Password" type="password" autoComplete="new-password" required fullWidth {...field('password')}/>
                    <TextField label="Confirm password" type="password" autoComplete="new-password" required fullWidth {...field('confirm')}/>
                </Stack>
                <Button type="submit" variant="contained" disabled={createDoctor.isPending} sx={{alignSelf: 'start'}}>
                    {createDoctor.isPending ? 'Adding…' : 'Add doctor'}
                </Button>
            </Stack>
        </Paper>
    );
}
