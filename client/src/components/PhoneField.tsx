import {useState} from 'react';
import {Stack, TextField} from '@mui/material';
import {COUNTRIES, countryLabel, splitE164, toE164} from '@/lib/phone';

const nativeSelect = {select: {native: true}, inputLabel: {shrink: true}};

interface Props {
    /** Initial value, E.164 (or legacy text). */
    defaultValue?: string | null;
    onChange: (e164: string) => void;
    error?: string;
    required?: boolean;
}

/** Country-code picker + number; reports the combined E.164 value ("+359888123456"). */
export default function PhoneField({defaultValue, onChange, error, required}: Props) {
    const [{iso, national}, setParts] = useState(() => splitE164(defaultValue));
    const update = (next: {iso: string; national: string}) => {
        setParts(next);
        onChange(toE164(COUNTRIES.find((c) => c.iso === next.iso)!.dial, next.national));
    };

    return (
        <Stack direction="row" sx={{gap: 1}}>
            <TextField
                label="Country code"
                select
                value={iso}
                onChange={(e) => update({iso: e.target.value, national})}
                slotProps={nativeSelect}
                sx={{width: 170, flexShrink: 0}}
            >
                {COUNTRIES.map((c) => (
                    <option key={c.iso} value={c.iso}>
                        {countryLabel(c)}
                    </option>
                ))}
            </TextField>
            <TextField
                label="Phone"
                type="tel"
                autoComplete="tel-national"
                required={required}
                value={national}
                onChange={(e) => update({iso, national: e.target.value})}
                error={!!error}
                helperText={error}
                fullWidth
            />
        </Stack>
    );
}
