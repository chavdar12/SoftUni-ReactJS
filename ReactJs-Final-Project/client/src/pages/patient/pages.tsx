import ListPage from '../../components/ListPage';
import CancelAppointmentButton from '../../components/CancelAppointmentButton';
import {useAppointments, usePrescriptions} from '../../api/hooks';
import {appointmentColumns, prescriptionColumns} from '../columns';

export const AppointmentsPage = () => (
    <ListPage
        title="My appointments"
        query={useAppointments()}
        columns={appointmentColumns}
        actions={(a) => a.status === 'active' && <CancelAppointmentButton appointment={a}/>}
    />
);

export const PrescriptionsPage = () => (
    <ListPage title="My prescriptions" query={usePrescriptions()} columns={prescriptionColumns}/>
);
