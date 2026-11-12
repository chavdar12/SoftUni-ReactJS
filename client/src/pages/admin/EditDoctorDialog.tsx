import {useState} from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField} from '@mui/material';
import {useUpdateDoctor} from '@/api/hooks';
import type {User} from '@/api/types';
import FormStatus from '@/components/FormStatus';
import WorkingHoursFields, {DEFAULT_HOURS} from '@/components/WorkingHoursFields';
import {SPECIALIZATIONS} from './AddDoctorForm';

const nativeSelect = {select: {native: true}, inputLabel: {shrink: true}};

/** Edit button + dialog for a doctor's name, specialization, room and hours. */
export default function EditDoctorButton({doctor}: {doctor: User}) {
    const update = useUpdateDoctor();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        name: doctor.name,
        specialization: doctor.specialization ?? SPECIALIZATIONS[0],
        roomNumber: String(doctor.roomNumber ?? 1),
        workingHours: doctor.workingHours ?? DEFAULT_HOURS,
    });
    const room = Number(form.roomNumber);
    const valid = form.name.trim() && Number.isInteger(room) && room >= 1 && form.workingHours.days.length > 0 &&
        form.workingHours.start < form.workingHours.end;
    const close = () => {
        setOpen(false);
        update.reset();
    };

    return (
        <>
            <Button size="small" onClick={() => setOpen(true)}>
                Edit
            </Button>
            <Dialog open={open} onClose={close} fullWidth>
                <DialogTitle>Edit {doctor.name}</DialogTitle>
                <DialogContent>
                    <Stack sx={{gap: 2, pt: 1}}>
                        <FormStatus error={update.error?.message}/>
                        <TextField label="Name" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}/>
                        <TextField
                            label="Specialization"
                            select
                            value={form.specialization}
                            onChange={(e) => setForm({...form, specialization: e.target.value})}
                            slotProps={nativeSelect}
                        >
                            {SPECIALIZATIONS.map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </TextField>
                        <TextField
                            label="Room"
                            type="number"
                            value={form.roomNumber}
                            onChange={(e) => setForm({...form, roomNumber: e.target.value})}
                        />
                        <WorkingHoursFields value={form.workingHours} onChange={(workingHours) => setForm({...form, workingHours})}/>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={close}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={!valid || update.isPending}
                        onClick={() =>
                            update.mutate({id: doctor.id, ...form, name: form.name.trim(), roomNumber: room}, {onSuccess: close})
                        }
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
