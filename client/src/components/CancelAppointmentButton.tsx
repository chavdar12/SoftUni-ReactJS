import {useState} from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from '@mui/material';
import {useCancelAppointment} from '@/api/hooks';
import type {Appointment} from '@/api/types';
import FormStatus from './FormStatus';

/** Cancel with an optional reason, in a confirm dialog. */
export default function CancelAppointmentButton({appointment}: {appointment: Appointment}) {
    const cancel = useCancelAppointment();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const close = () => {
        setOpen(false);
        cancel.reset();
    };

    return (
        <>
            <Button color="error" size="small" onClick={() => setOpen(true)}>
                Cancel
            </Button>
            <Dialog open={open} onClose={close} fullWidth>
                <DialogTitle>Cancel this appointment? This cannot be undone.</DialogTitle>
                <DialogContent>
                    <FormStatus error={cancel.error?.message}/>
                    <TextField
                        label="Reason (optional)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        slotProps={{htmlInput: {maxLength: 500}}}
                        fullWidth
                        multiline
                        sx={{mt: 1}}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={close}>No</Button>
                    <Button
                        color="error"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate({id: appointment.id, reason: reason.trim() || undefined}, {onSuccess: close})}
                    >
                        Yes, cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
