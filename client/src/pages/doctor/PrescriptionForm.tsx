import {Button, Stack, TextField} from '@mui/material';
import {z} from 'zod';
import {usePrescribe} from '@/api/hooks';
import type {Appointment} from '@/api/types';
import useZodForm from '@/useZodForm';
import FormStatus from '@/components/FormStatus';

const schema = z.object({
    disease: z.string().trim().min(1, 'Required'),
    medication: z.string().trim().min(1, 'Required'),
});

/** Writes a prescription for `appointment` and marks it done, then calls onDone. */
export default function PrescriptionForm({appointment, onDone}: {appointment: Appointment; onDone: () => void}) {
    const prescribe = usePrescribe();
    const {handleSubmit, field} = useZodForm(schema);
    const onSubmit = handleSubmit((v) => prescribe.mutate({id: appointment.id, ...v}, {onSuccess: onDone}));

    return (
        <Stack component="form" noValidate onSubmit={onSubmit} sx={{gap: 2, pt: 1}}>
            <FormStatus error={prescribe.error?.message}/>
            <TextField label="Diagnosis" required autoFocus {...field('disease')}/>
            <TextField label="Medication" required multiline minRows={2} {...field('medication')}/>
            <Button type="submit" variant="contained" disabled={prescribe.isPending}>
                {prescribe.isPending ? 'Saving…' : 'Prescribe'}
            </Button>
        </Stack>
    );
}
