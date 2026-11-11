import {useState} from 'react';
import {Button, Paper, Stack, TextField, Typography} from '@mui/material';
import {useAuth} from '../../auth/AuthProvider';
import {bookAppointment} from '../../api';
import useCollection from '../../useCollection';
import useSubmit from '../../useSubmit';
import FormStatus from '../../components/FormStatus';

const nativeSelect = {select: {native: true}, inputLabel: {shrink: true}};

export default function BookAppointmentForm() {
    const {profile} = useAuth();
    const {rows: doctors} = useCollection('users', 'role', 'doctor');
    const [specialization, setSpecialization] = useState('');

    const specializations = [...new Set(doctors.map((d) => d.specialization))].sort();
    const matching = doctors.filter((d) => d.specialization === specialization);

    const {onSubmit, busy, error, message} = useSubmit(async ({doctorId, date}, form) => {
        await bookAppointment(profile, doctors.find((d) => d.id === doctorId), date);
        form.reset();
        setSpecialization('');
    }, 'Appointment booked.');

    return (
        <Paper sx={{p: 2, maxWidth: 480}}>
            <Typography variant="h5" component="h1" gutterBottom>
                Book an appointment
            </Typography>
            <Stack component="form" onSubmit={onSubmit} sx={{gap: 2}}>
                <FormStatus error={error} message={message}/>
                <TextField
                    label="Specialization"
                    select
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    slotProps={nativeSelect}
                >
                    <option value="" disabled/>
                    {specializations.map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                </TextField>
                <TextField
                    key={specialization}
                    label="Doctor"
                    name="doctorId"
                    select
                    required
                    defaultValue=""
                    disabled={!specialization}
                    slotProps={nativeSelect}
                >
                    <option value="" disabled/>
                    {matching.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name} (room {d.roomNumber})
                        </option>
                    ))}
                </TextField>
                <TextField label="Date and time" name="date" type="datetime-local" required
                           slotProps={{inputLabel: {shrink: true}}}/>
                <Button type="submit" variant="contained" disabled={busy}>
                    {busy ? 'Booking…' : 'Book appointment'}
                </Button>
            </Stack>
        </Paper>
    );
}
