import {useCancelAppointment} from '../api/hooks';
import type {Appointment} from '../api/types';
import ConfirmButton from './ConfirmButton';

export default function CancelAppointmentButton({appointment}: {appointment: Appointment}) {
    const cancel = useCancelAppointment();
    return (
        <ConfirmButton
            color="error"
            size="small"
            question="Cancel this appointment? This cannot be undone."
            // shortcut: errors surface via alert(); use a snackbar if this grows.
            onConfirm={() => cancel.mutate(appointment.id, {onError: (e) => alert(e.message)})}
        >
            Cancel
        </ConfirmButton>
    );
}
