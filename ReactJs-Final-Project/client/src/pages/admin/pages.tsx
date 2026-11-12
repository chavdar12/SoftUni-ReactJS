import {Alert, LinearProgress, Paper, Stack, Typography} from '@mui/material';
import ListPage from '@/components/ListPage';
import ConfirmButton from '@/components/ConfirmButton';
import DataTable from '@/components/DataTable';
import {
    EXPORT_LIMIT,
    fetchPage,
    useAppointments,
    useDeleteDoctor,
    useDoctorsPage,
    usePatientsPage,
    usePrescriptions,
    useStats,
} from '@/api/hooks';
import {http} from '@/api/client';
import type {Appointment, Prescription, User} from '@/api/types';
import {appointmentColumns, doctorColumns, patientColumns, prescriptionColumns} from '@/pages/columns';
import AddDoctorForm from './AddDoctorForm';
import EditDoctorButton from './EditDoctorDialog';

const exportAll = <T,>(url: string) => (p: object) => fetchPage<T>(url, {...p, page: 0, limit: EXPORT_LIMIT}).then((r) => r.items);
const exportWhole = <T,>(url: string) => () => http.get<T[]>(url).then((r) => r.data);

function Tile({label, value}: {label: string; value: number}) {
    return (
        <Paper sx={{p: 2, minWidth: 140, flex: 1}}>
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="h4" component="p">
                {value}
            </Typography>
        </Paper>
    );
}

export function DashboardPage() {
    const stats = useStats();
    const s = stats.data;
    return (
        <>
            <Typography variant="h5" component="h1" gutterBottom>
                Dashboard
            </Typography>
            {stats.isPending && <LinearProgress/>}
            {stats.error && <Alert severity="error">{stats.error.message}</Alert>}
            {s && (
                <>
                    <Stack direction={{xs: 'column', sm: 'row'}} sx={{gap: 2, mb: 3}}>
                        <Tile label="All appointments" value={s.total}/>
                        <Tile label="Active" value={s.byStatus.active}/>
                        <Tile label="Done" value={s.byStatus.done}/>
                        <Tile label="Cancelled" value={s.byStatus.cancelled}/>
                    </Stack>
                    <Paper sx={{p: 2}}>
                        <Typography variant="h6" component="h2">
                            Busiest doctors
                        </Typography>
                        <DataTable
                            columns={[
                                {id: 'doctorName', label: 'Doctor'},
                                {id: 'count', label: 'Appointments'},
                            ]}
                            rows={s.byDoctor.map((d) => ({...d, id: d.doctorId}))}
                        />
                    </Paper>
                </>
            )}
        </>
    );
}

export function DoctorsPage() {
    const deleteDoctor = useDeleteDoctor();
    return (
        <ListPage
            title="Doctors"
            source={useDoctorsPage}
            columns={doctorColumns}
            exportRows={exportWhole<User>('/doctors')}
            actions={(doctor) => (
                <>
                    <EditDoctorButton doctor={doctor}/>
                    <ConfirmButton
                        color="error"
                        size="small"
                        question={`Remove ${doctor.name}? They will no longer be able to sign in or be booked.`}
                        // shortcut: errors surface via alert(); use a snackbar if this grows.
                        onConfirm={() => deleteDoctor.mutate(doctor.id, {onError: (e) => alert(e.message)})}
                    >
                        Remove
                    </ConfirmButton>
                </>
            )}
        >
            <AddDoctorForm/>
        </ListPage>
    );
}

export const PatientsPage = () => (
    <ListPage title="Patients" source={usePatientsPage} columns={patientColumns} exportRows={exportWhole<User>('/patients')}/>
);

export const AppointmentsPage = () => (
    <ListPage
        title="All appointments"
        source={useAppointments}
        columns={appointmentColumns}
        exportRows={exportAll<Appointment>('/appointments')}
    />
);

export const PrescriptionsPage = () => (
    <ListPage
        title="All prescriptions"
        source={usePrescriptions}
        columns={prescriptionColumns}
        exportRows={exportAll<Prescription>('/prescriptions')}
    />
);
