import {useState} from 'react';
import {Alert, Box, Button, Dialog, DialogContent, DialogTitle, LinearProgress, Paper, Stack, Tab, Tabs, Typography} from '@mui/material';
import {EXPORT_LIMIT, useAppointments, useDecideRefill, usePrescriptions} from '@/api/hooks';
import type {Appointment, ListParams} from '@/api/types';
import ListPage from '@/components/ListPage';
import CancelAppointmentButton from '@/components/CancelAppointmentButton';
import PrintPrescriptionButton from '@/components/PrintPrescriptionButton';
import HistoryView from '@/components/HistoryView';
import {appointmentColumns, prescriptionColumns} from '@/pages/columns';
import PrescriptionForm from './PrescriptionForm';
import {addDays, groupByDay, startOfWeek} from './week';
import {format, startOfToday} from 'date-fns';
import {formatTime} from '@/lib/dates';


const RANGES: Record<string, () => Partial<ListParams>> = {
    Upcoming: () => ({status: 'active', from: new Date().toISOString()}),
    Today: () => ({from: startOfToday().toISOString(), to: addDays(startOfToday(), 1).toISOString()}),
    'Next 7 days': () => ({from: startOfToday().toISOString(), to: addDays(startOfToday(), 7).toISOString()}),
    All: () => ({}),
};

function HistoryDialog({patient, onClose}: {patient: {id: string; name: string} | null; onClose: () => void}) {
    return (
        <Dialog open={!!patient} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Medical history: {patient?.name}</DialogTitle>
            <DialogContent>{patient && <HistoryView patientId={patient.id} canAddNote/>}</DialogContent>
        </Dialog>
    );
}

export function AppointmentsPage() {
    const [treating, setTreating] = useState<Appointment | null>(null);
    const [patient, setPatient] = useState<{id: string; name: string} | null>(null);
    const [range, setRange] = useState('Upcoming');
    // Computed once per tab click, so "now" doesn't change the query key on every render.
    const [filters, setFilters] = useState(RANGES.Upcoming);

    return (
        <>
            <ListPage
                title="My appointments"
                source={useAppointments}
                columns={appointmentColumns}
                filters={filters}
                actions={(a) => (
                    <>
                        {a.status === 'active' && (
                            <>
                                <Button size="small" onClick={() => setTreating(a)}>
                                    Prescribe
                                </Button>
                                <CancelAppointmentButton appointment={a}/>
                            </>
                        )}
                        <Button size="small" onClick={() => setPatient({id: a.patientId, name: a.patientName})}>
                            History
                        </Button>
                    </>
                )}
            >
                <Tabs
                    value={range}
                    onChange={(_, r: string) => {
                        setRange(r);
                        setFilters(RANGES[r]());
                    }}
                    sx={{mb: 2}}
                >
                    {Object.keys(RANGES).map((r) => (
                        <Tab key={r} label={r} value={r}/>
                    ))}
                </Tabs>
            </ListPage>
            <Dialog open={!!treating} onClose={() => setTreating(null)} fullWidth>
                <DialogTitle>Prescription for {treating?.patientName}</DialogTitle>
                <DialogContent>
                    {treating && <PrescriptionForm appointment={treating} onDone={() => setTreating(null)}/>}
                </DialogContent>
            </Dialog>
            <HistoryDialog patient={patient} onClose={() => setPatient(null)}/>
        </>
    );
}

/** A week at a glance: one column per day. */
export function SchedulePage() {
    const [monday, setMonday] = useState(() => startOfWeek(new Date()));
    const query = useAppointments({
        page: 0,
        limit: EXPORT_LIMIT,
        from: monday.toISOString(),
        to: addDays(monday, 7).toISOString(),
    });
    const days = groupByDay(monday, (query.data?.items ?? []).filter((a) => a.status !== 'cancelled'));

    return (
        <>
            <Typography variant="h5" component="h1" gutterBottom>
                Schedule
            </Typography>
            <Stack direction="row" sx={{gap: 1, mb: 2, alignItems: 'center'}}>
                <Button onClick={() => setMonday(addDays(monday, -7))}>Previous week</Button>
                <Button onClick={() => setMonday(startOfWeek(new Date()))}>This week</Button>
                <Button onClick={() => setMonday(addDays(monday, 7))}>Next week</Button>
            </Stack>
            {query.isFetching && <LinearProgress/>}
            {query.error && <Alert severity="error">{query.error.message}</Alert>}
            <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'repeat(7, 1fr)'}, gap: 1}}>
                {days.map(({day, items}) => (
                    <Paper key={day.toISOString()} sx={{p: 1, minHeight: 120}}>
                        <Typography variant="subtitle2" component="h2">
                            {format(day, 'EEE d MMM')}
                        </Typography>
                        {items.map((a) => (
                            <Box key={a.id} sx={{mt: 1, p: 0.5, borderRadius: 1, bgcolor: a.status === 'done' ? 'action.selected' : 'primary.main', color: a.status === 'done' ? 'text.primary' : 'primary.contrastText'}}>
                                <Typography variant="caption" component="p">
                                    {formatTime(a.date)} {a.patientName}
                                </Typography>
                                {a.reason && (
                                    <Typography variant="caption" component="p" sx={{opacity: 0.8}}>
                                        {a.reason}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                    </Paper>
                ))}
            </Box>
        </>
    );
}

export function PrescriptionsPage() {
    const decide = useDecideRefill();
    const onError = (e: Error) => alert(e.message);
    return (
        <ListPage
            title="Prescriptions I wrote"
            source={usePrescriptions}
            columns={prescriptionColumns}
            actions={(p) => (
                <>
                    <PrintPrescriptionButton prescription={p}/>
                    {p.refillStatus === 'requested' && (
                        <>
                            <Button size="small" color="success" onClick={() => decide.mutate({id: p.id, approve: true}, {onError})}>
                                Approve refill
                            </Button>
                            <Button size="small" color="error" onClick={() => decide.mutate({id: p.id, approve: false}, {onError})}>
                                Deny
                            </Button>
                        </>
                    )}
                </>
            )}
        />
    );
}
