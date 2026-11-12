import {Checkbox, FormControlLabel, FormGroup, FormLabel, Stack, TextField} from '@mui/material';
import type {WorkingHours} from '@/api/types';

export const DEFAULT_HOURS: WorkingHours = {days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00'};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIMES = Array.from({length: 48}, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
const nativeSelect = {select: {native: true}, inputLabel: {shrink: true}};

/** Controlled editor for a doctor's weekly hours (clinic time). */
export default function WorkingHoursFields({value, onChange}: {value: WorkingHours; onChange: (h: WorkingHours) => void}) {
    const toggle = (d: number) =>
        onChange({...value, days: value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d].sort()});
    const invalid = value.start >= value.end;

    return (
        <Stack sx={{gap: 1}}>
            <FormLabel component="legend">Working days</FormLabel>
            <FormGroup row>
                {DAYS.map((label, d) => (
                    <FormControlLabel
                        key={label}
                        label={label}
                        control={<Checkbox checked={value.days.includes(d)} onChange={() => toggle(d)}/>}
                    />
                ))}
            </FormGroup>
            <Stack direction="row" sx={{gap: 2}}>
                {(['start', 'end'] as const).map((k) => (
                    <TextField
                        key={k}
                        label={k === 'start' ? 'From' : 'To'}
                        select
                        value={value[k]}
                        onChange={(e) => onChange({...value, [k]: e.target.value})}
                        error={k === 'end' && invalid}
                        helperText={k === 'end' && invalid ? 'Must be after start' : undefined}
                        slotProps={nativeSelect}
                    >
                        {TIMES.map((t) => (
                            <option key={t}>{t}</option>
                        ))}
                    </TextField>
                ))}
            </Stack>
        </Stack>
    );
}
