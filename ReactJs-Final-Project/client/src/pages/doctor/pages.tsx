import {useState} from 'react';
import {Button, Dialog, DialogContent, DialogTitle} from '@mui/material';
import {useAppointments, usePrescriptions} from '../../api/hooks';
import type {Appointment} from '../../api/types';
import ListPage from '../../components/ListPage';
import CancelAppointmentButton from '../../components/CancelAppointmentButton';
import {appointmentColumns, prescriptionColumns} from '../columns';
import PrescriptionForm from './PrescriptionForm';

export function AppointmentsPage() {
    const [treating, setTreating] = useState<Appointment | null>(null);

    return (
        <>
            <ListPage
                title="My appointments"
                query={useAppointments()}
                columns={appointmentColumns}
                actions={(a) =>
                    a.status === 'active' && (
                        <>
                            <Button size="small" onClick={() => setTreating(a)}>
                                Prescribe
                            </Button>
                            <CancelAppointmentButton appointment={a}/>
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
    return <ListPage title="Prescriptions I wrote" query={usePrescriptions()} columns={prescriptionColumns}/>;
}
