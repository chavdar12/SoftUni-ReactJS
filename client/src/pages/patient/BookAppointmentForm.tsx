import {Button, Paper, Stack, TextField, Typography} from '@mui/material';
import {z} from 'zod';
import {useBookAppointment, useDoctors, useRatings} from '@/api/hooks';
import useZodForm from '@/useZodForm';
import FormStatus from '@/components/FormStatus';
import SlotPicker from '@/components/SlotPicker';

const schema = z.object({
    specialization: z.string().min(1, 'Pick a specialization'),
    doctorId: z.string().min(1, 'Pick a doctor'),
    date: z.string('Pick a time').min(1, 'Pick a time'),
    reason: z.string().trim().max(500, 'At most 500 characters').optional(),
});

const nativeSelect = {select: {native: true}, inputLabel: {shrink: true}};

export default function BookAppointmentForm() {
    const {data: doctors = []} = useDoctors();
    const {data: ratings = []} = useRatings();
    const book = useBookAppointment();
    const {handleSubmit, field, reset, setValue, watch, formState} = useZodForm(schema);

    const specialization = watch('specialization');
    const doctorId = watch('doctorId');
    const specializations = [...new Set(doctors.map((d) => d.specialization ?? ''))].sort();
    const matching = doctors.filter((d) => d.specialization === specialization);
    const stars = (id: string) => {
        const r = ratings.find((x) => x.doctorId === id);
        return r ? `, ★ ${r.average} (${r.count})` : '';
    };
    const onSubmit = handleSubmit(({doctorId, date, reason}) =>
        book.mutate({doctorId, date, reason: reason || undefined}, {onSuccess: () => reset()}),
    );

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
                    {...field('doctorId', {onChange: () => setValue('date', '')})}
                >
                    <option value="" disabled/>
                    {matching.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name} (room {d.roomNumber}{stars(d.id)})
                        </option>
                    ))}
                </TextField>
                <SlotPicker
                    key={doctorId}
                    doctorId={doctorId ?? ''}
                    value={watch('date') ?? ''}
                    onChange={(start) => setValue('date', start, {shouldValidate: formState.isSubmitted})}
                    error={formState.errors.date?.message}
                />
                <TextField label="Reason for visit (optional)" multiline minRows={2} {...field('reason')}/>
                <Button type="submit" variant="contained" disabled={book.isPending}>
                    {book.isPending ? 'Booking…' : 'Book appointment'}
                </Button>
            </Stack>
        </Paper>
    );
}
