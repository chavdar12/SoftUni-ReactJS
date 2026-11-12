import {Button, Paper, Stack, TextField, Typography} from '@mui/material';
import {z} from 'zod';
import {useBookAppointment, useDoctors} from '../../api/hooks';
import useZodForm from '../../useZodForm';
import FormStatus from '../../components/FormStatus';

const schema = z.object({
    specialization: z.string().min(1, 'Pick a specialization'),
    doctorId: z.string().min(1, 'Pick a doctor'),
    date: z
        .string()
        .min(1, 'Pick a date and time')
        .refine((d) => new Date(d) > new Date(), 'Must be in the future'),
});

const nativeSelect = {select: {native: true}, inputLabel: {shrink: true}};

export default function BookAppointmentForm() {
    const {data: doctors = []} = useDoctors();
    const book = useBookAppointment();
    const {handleSubmit, field, reset, setValue, watch} = useZodForm(schema);

    const specialization = watch('specialization');
    const specializations = [...new Set(doctors.map((d) => d.specialization ?? ''))].sort();
    const matching = doctors.filter((d) => d.specialization === specialization);
    const onSubmit = handleSubmit(({doctorId, date}) => book.mutate({doctorId, date}, {onSuccess: () => reset()}));

    return (
        <Paper sx={{p: 2, maxWidth: 480}}>
            <Typography variant="h5" component="h1" gutterBottom>
                Book an appointment
            </Typography>
            <Stack component="form" noValidate onSubmit={onSubmit} sx={{gap: 2}}>
                <FormStatus error={book.error?.message} message={book.isSuccess ? 'Appointment booked.' : ''}/>
                <TextField
                    label="Specialization"
                    select
                    required
                    defaultValue=""
                    slotProps={nativeSelect}
                    {...field('specialization', {onChange: () => setValue('doctorId', '')})}
                >
                    <option value="" disabled/>
                    {specializations.map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                </TextField>
                <TextField
                    label="Doctor"
                    select
                    required
                    defaultValue=""
                    disabled={!specialization}
                    slotProps={nativeSelect}
                    {...field('doctorId')}
                >
                    <option value="" disabled/>
                    {matching.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name} (room {d.roomNumber})
                        </option>
                    ))}
                </TextField>
                <TextField
                    label="Date and time"
                    type="datetime-local"
                    required
                    slotProps={{inputLabel: {shrink: true}}}
                    {...field('date')}
                />
                <Button type="submit" variant="contained" disabled={book.isPending}>
                    {book.isPending ? 'Booking…' : 'Book appointment'}
                </Button>
            </Stack>
        </Paper>
    );
}
