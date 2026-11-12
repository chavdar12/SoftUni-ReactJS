import ListPage from '../../components/ListPage';
import ConfirmButton from '../../components/ConfirmButton';
import {useAppointments, useDeleteDoctor, useDoctors, usePatients, usePrescriptions} from '../../api/hooks';
import {appointmentColumns, doctorColumns, patientColumns, prescriptionColumns} from '../columns';
import AddDoctorForm from './AddDoctorForm';

export function DoctorsPage() {
    const doctors = useDoctors();
    const deleteDoctor = useDeleteDoctor();
    return (
        <ListPage
            title="Doctors"
            query={doctors}
            columns={doctorColumns}
            actions={(doctor) => (
                <ConfirmButton
                    color="error"
                    size="small"
                    question={`Delete ${doctor.name}? This cannot be undone.`}
                    onConfirm={() => deleteDoctor.mutate(doctor.id, {onError: (e) => alert(e.message)})}
                >
                    Delete
                </ConfirmButton>
            )}
        >
            <AddDoctorForm/>
        </ListPage>
    );
}

export const PatientsPage = () => <ListPage title="Patients" query={usePatients()} columns={patientColumns}/>;

export const AppointmentsPage = () => (
    <ListPage title="All appointments" query={useAppointments()} columns={appointmentColumns}/>
);

export const PrescriptionsPage = () => (
    <ListPage title="All prescriptions" query={usePrescriptions()} columns={prescriptionColumns}/>
);
