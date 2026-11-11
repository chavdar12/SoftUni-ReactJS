import {useState} from 'react';
import {Button, Dialog, DialogActions, DialogTitle} from '@mui/material';

/** Button that asks "question" in a dialog before calling onConfirm. */
export default function ConfirmButton({question, onConfirm, children, ...buttonProps}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button {...buttonProps} onClick={() => setOpen(true)}>
                {children}
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>{question}</DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>No</Button>
                    <Button
                        color="error"
                        onClick={() => {
                            setOpen(false);
                            onConfirm();
                        }}
                    >
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
