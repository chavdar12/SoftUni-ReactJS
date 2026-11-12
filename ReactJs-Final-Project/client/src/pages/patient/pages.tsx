import {useState} from 'react';
import {differenceInMinutes} from 'date-fns';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Rating, Stack, Typography} from '@mui/material';
import ListPage from '@/components/ListPage';
import CancelAppointmentButton from '@/components/CancelAppointmentButton';
import PrintPrescriptionButton from '@/components/PrintPrescriptionButton';
import HistoryView from '@/components/HistoryView';
import FormStatus from '@/components/FormStatus';
import SlotPicker from '@/components/SlotPicker';
import {useAppointments, usePrescriptions, useRate, useRequestRefill, useReschedule} from '@/api/hooks';
import type {Appointment, Prescription} from '@/api/types';
import {useAuth} from '@/auth/useAuth';
import {appointmentColumns, prescriptionColumns} from '@/pages/columns';

const CUTOFF_MINUTES = 120; // mirrors the server's rule; the server has the final say
const changeable = (a: Appointment) =>
    a.status === 'active' && differenceInMinutes(a.date, new Date()) >= CUTOFF_MINUTES;

function RescheduleButton({appointment}: {appointment: Appointment}) {
    const reschedule = useReschedule();
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState('');
    const close = () => {
        setOpen(false);
        setDate('');
        reschedule.reset();
    };
    return (
        <>
            <Button size="small" onClick={() => setOpen(true)}>
                Reschedule
            </Button>
            <Dialog open={open} onClose={close} fullWidth>
                <DialogTitle>Move your appointment with {appointment.doctorName}</DialogTitle>
                <DialogContent>
                    <Stack sx={{gap: 2, pt: 1}}>
                        <FormStatus error={reschedule.error?.message}/>
                        <SlotPicker doctorId={appointment.doctorId} value={date} onChange={setDate}/>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={close}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={!date || reschedule.isPending}
                        onClick={() => reschedule.mutate({id: appointment.id, date}, {onSuccess: close})}
                    >
                        Move
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export const AppointmentsPage = () => (
    <ListPage
        title="My appointments"
        source={useAppointments}
        columns={appointmentColumns}
        actions={(a) =>
            changeable(a) && (
                <>
                    <RescheduleButton appointment={a}/>
                    <CancelAppointmentButton appointment={a}/>
                </>
            )
        }
    />
);

function RateCell({prescription: p}: {prescription: Prescription}) {
    const rate = useRate();
    return (
        <Rating
            size="small"
            value={p.rating ?? null}
            readOnly={!!p.rating || rate.isPending}
            onChange={(_, stars) => stars && rate.mutate({id: p.id, stars}, {onError: (e) => alert(e.message)})}
            aria-label={`Rate ${p.doctorName}`}
        />
    );
}

export function PrescriptionsPage() {
    const refill = useRequestRefill();
    return (
        <ListPage
            title="My prescriptions"
            source={usePrescriptions}
            columns={[...prescriptionColumns, {id: 'rating', label: 'Your rating', format: (_, p) => <RateCell prescription={p}/>}]}
            actions={(p) => (
                <>
                    <PrintPrescriptionButton prescription={p}/>
                    {p.refillStatus !== 'requested' && p.refillStatus !== 'approved' && (
                        <Button size="small" onClick={() => refill.mutate(p.id, {onError: (e) => alert(e.message)})}>
                            Request refill
                        </Button>
                    )}
                </>
            )}
        />
    );
}

export function HistoryPage() {
    const {profile} = useAuth();
    return (
        <>
            <Typography variant="h5" component="h1" gutterBottom>
                My medical history
            </Typography>
            {profile && <HistoryView patientId={profile.id}/>}
        </>
    );
}
