import {Button, Stack, TextField} from '@mui/material';
import {prescribe} from '../../api';
import useSubmit from '../../useSubmit';
import FormStatus from '../../components/FormStatus';

/** Writes a prescription for `appointment` and marks it done, then calls onDone. */
export default function PrescriptionForm({appointment, onDone}) {
    const {onSubmit, busy, error} = useSubmit(async (values) => {
        await prescribe(appointment, values);
        onDone();
    });

    return (
        <Stack component="form" onSubmit={onSubmit} sx={{gap: 2, pt: 1}}>
            <FormStatus error={error}/>
            <TextField label="Diagnosis" name="disease" required autoFocus/>
            <TextField label="Medication" name="medication" required multiline minRows={2}/>
            <Button type="submit" variant="contained" disabled={busy}>
                {busy ? 'Saving…' : 'Prescribe'}
            </Button>
        </Stack>
    );
}
