import {TextField, type TextFieldProps} from '@mui/material';

/** A 6-digit one-time code input (authenticator, email or SMS); lets the browser fill SMS codes. */
export default function CodeField(props: TextFieldProps) {
    return (
        <TextField
            label="6-digit code"
            autoComplete="one-time-code"
            {...props}
            slotProps={{htmlInput: {inputMode: 'numeric', pattern: '\\d{6}', maxLength: 6}}}
        />
    );
}
