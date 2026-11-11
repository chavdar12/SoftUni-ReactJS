import ListPage from '../../components/ListPage';
import ConfirmButton from '../../components/ConfirmButton';
import {deleteDoctor} from '../../api';
import {appointmentColumns, doctorColumns, patientColumns, prescriptionColumns} from '../columns';
import AddDoctorForm from './AddDoctorForm';

export const DoctorsPage = () => (
    <ListPage
        title="Doctors"
        collection="users"
        field="role"
        value="doctor"
        columns={doctorColumns}
        actions={(doctor) => (
            <ConfirmButton
                color="error"
                size="small"
                question={`Delete ${doctor.name}? This cannot be undone.`}
                onConfirm={() => deleteDoctor(doctor.id).catch((e) => alert(e.message))}
            >
                Delete
            </ConfirmButton>
        )}
    >
        <AddDoctorForm/>
    </ListPage>
);

export const PatientsPage = () => (
    <ListPage title="Patients" collection="users" field="role" value="patient" columns={patientColumns}/>
);

export const AppointmentsPage = () => (
    <ListPage title="All appointments" collection="appointments" columns={appointmentColumns}/>
);

export const PrescriptionsPage = () => (
    <ListPage title="All prescriptions" collection="prescriptions" columns={prescriptionColumns}/>
);
