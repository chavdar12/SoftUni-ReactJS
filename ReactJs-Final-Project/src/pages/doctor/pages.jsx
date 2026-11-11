import {useState} from 'react';
import {Button, Dialog, DialogContent, DialogTitle} from '@mui/material';
import {useAuth} from '../../auth/AuthProvider';
import ListPage from '../../components/ListPage';
import CancelAppointmentButton from '../../components/CancelAppointmentButton';
import {appointmentColumns, prescriptionColumns} from '../columns';
import PrescriptionForm from './PrescriptionForm';

export function AppointmentsPage() {
    const {profile} = useAuth();
    const [treating, setTreating] = useState(null);

    return (
        <>
            <ListPage
                title="My appointments"
                collection="appointments"
                field="doctorId"
                value={profile.uid}
                columns={appointmentColumns}
                actions={(a) =>
                    a.status === 'active' && (
                        <>
                            <Button size="small" onClick={() => setTreating(a)}>
                                Prescribe
                            </Button>
                            <CancelAppointmentButton appointment={a} by={profile.name}/>
                        </>
                    )
                }
            />
            <Dialog open={!!treating} onClose={() => setTreating(null)} fullWidth>
                <DialogTitle>Prescription for {treating?.patientName}</DialogTitle>
                <DialogContent>
                    {treating && <PrescriptionForm appointment={treating} onDone={() => setTreating(null)}/>}
                </DialogContent>
            </Dialog>
        </>
    );
}

export function PrescriptionsPage() {
    const {profile} = useAuth();
    return (
        <ListPage
            title="Prescriptions I wrote"
            collection="prescriptions"
            field="doctorId"
            value={profile.uid}
            columns={prescriptionColumns}
        />
    );
}
