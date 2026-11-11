import {useAuth} from '../../auth/AuthProvider';
import ListPage from '../../components/ListPage';
import CancelAppointmentButton from '../../components/CancelAppointmentButton';
import {appointmentColumns, prescriptionColumns} from '../columns';

export function AppointmentsPage() {
    const {profile} = useAuth();
    return (
        <ListPage
            title="My appointments"
            collection="appointments"
            field="patientId"
            value={profile.uid}
            columns={appointmentColumns}
            actions={(a) => a.status === 'active' && <CancelAppointmentButton appointment={a} by={profile.name}/>}
        />
    );
}

export function PrescriptionsPage() {
    const {profile} = useAuth();
    return (
        <ListPage
            title="My prescriptions"
            collection="prescriptions"
            field="patientId"
            value={profile.uid}
            columns={prescriptionColumns}
        />
    );
}
