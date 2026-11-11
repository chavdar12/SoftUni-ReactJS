import {cancelAppointment} from '../api';
import ConfirmButton from './ConfirmButton';

export default function CancelAppointmentButton({appointment, by}) {
    return (
        <ConfirmButton
            color="error"
            size="small"
            question="Cancel this appointment? This cannot be undone."
            // shortcut: errors surface via alert(); use a snackbar if this grows.
            onConfirm={() => cancelAppointment(appointment.id, by).catch((e) => alert(e.message))}
        >
            Cancel
        </ConfirmButton>
    );
}
