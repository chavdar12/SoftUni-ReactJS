import {useState} from 'react';
import {Box, Button, Dialog, DialogActions, DialogContent, Typography} from '@mui/material';
import type {Prescription} from '@/api/types';
import {formatDate} from '@/lib/dates';

/** Opens a printable prescription; the print stylesheet in main.tsx prints only `.printable`. */
export default function PrintPrescriptionButton({prescription: p}: {prescription: Prescription}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button size="small" onClick={() => setOpen(true)}>
                Print
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
                <DialogContent>
                    <Box className="printable" sx={{p: 2, bgcolor: 'background.paper'}}>
                        <Typography variant="h5" component="h2" gutterBottom>
                            Prescription
                        </Typography>
                        <Typography>Patient: {p.patientName}</Typography>
                        <Typography>Doctor: {p.doctorName}</Typography>
                        <Typography gutterBottom>Date: {formatDate(p.date)}</Typography>
                        <Typography variant="h6" component="h3">
                            Diagnosis
                        </Typography>
                        <Typography gutterBottom>{p.disease}</Typography>
                        <Typography variant="h6" component="h3">
                            Medication
                        </Typography>
                        <Typography sx={{whiteSpace: 'pre-wrap'}}>{p.medication}</Typography>
                    </Box>
                </DialogContent>
                <DialogActions className="no-print">
                    <Button onClick={() => setOpen(false)}>Close</Button>
                    <Button variant="contained" onClick={() => window.print()}>
                        Print
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
