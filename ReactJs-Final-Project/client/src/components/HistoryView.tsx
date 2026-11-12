import {useState} from 'react';
import {Alert, Button, LinearProgress, List, ListItem, ListItemText, Stack, TextField, Typography} from '@mui/material';
import {useAddNote, useHistory} from '@/api/hooks';
import type {Appointment} from '@/api/types';
import DataTable, {type Column} from './DataTable';
import FormStatus from './FormStatus';
import {formatDateTime} from '@/lib/dates';

const columns: Column<Appointment>[] = [
    {id: 'date', label: 'Date', format: (d) => formatDateTime(d as string)},
    {id: 'doctorName', label: 'Doctor'},
    {id: 'status', label: 'Status'},
    {id: 'reason', label: 'Reason'},
    {id: 'prescription', label: 'Diagnosis / medication', format: (_, a) => a.prescription && `${a.prescription.disease}: ${a.prescription.medication}`},
];

/** A patient's medical history: doctors' notes and every appointment. Doctors can add notes. */
export default function HistoryView({patientId, canAddNote}: {patientId: string; canAddNote?: boolean}) {
    const history = useHistory(patientId);
    const addNote = useAddNote();
    const [text, setText] = useState('');

    return (
        <Stack sx={{gap: 2}}>
            {history.isPending && <LinearProgress/>}
            {history.error && <Alert severity="error">{history.error.message}</Alert>}
            <Typography variant="h6" component="h2">
                Notes
            </Typography>
            {canAddNote && (
                <Stack
                    component="form"
                    sx={{gap: 1}}
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (text.trim()) addNote.mutate({patientId, text: text.trim()}, {onSuccess: () => setText('')});
                    }}
                >
                    <FormStatus error={addNote.error?.message}/>
                    <TextField label="New note" multiline minRows={2} value={text} onChange={(e) => setText(e.target.value)}/>
                    <Button type="submit" disabled={addNote.isPending || !text.trim()} sx={{alignSelf: 'start'}}>
                        Add note
                    </Button>
                </Stack>
            )}
            <List dense>
                {history.data?.notes.map((n) => (
                    <ListItem key={n.id} disableGutters>
                        <ListItemText
                            primary={n.text}
                            secondary={`${n.doctorName}, ${formatDateTime(n.createdAt)}`}
                            slotProps={{primary: {sx: {whiteSpace: 'pre-wrap'}}}}
                        />
                    </ListItem>
                ))}
                {history.data?.notes.length === 0 && <Typography color="text.secondary">No notes yet.</Typography>}
            </List>
            <Typography variant="h6" component="h2">
                Appointments
            </Typography>
            <DataTable columns={columns} rows={history.data?.appointments ?? []}/>
        </Stack>
    );
}
