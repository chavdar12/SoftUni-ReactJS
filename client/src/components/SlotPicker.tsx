import {useState} from 'react';
import {TextField} from '@mui/material';
import {useAvailability} from '@/api/hooks';
import {formatTime, toDayValue} from '@/lib/dates';

const nativeSelect = {select: {native: true}, inputLabel: {shrink: true}};

interface Props {
    doctorId: string;
    /** The chosen slot's ISO start, or ''. */
    value: string;
    onChange: (start: string) => void;
    error?: string;
}

/** Date + a select of the doctor's slots that day; taken ones are disabled. Give it key={doctorId}. */
export default function SlotPicker({doctorId, value, onChange, error}: Props) {
    const [day, setDay] = useState('');
    const slots = useAvailability(doctorId, day);
    const hint = slots.error?.message ?? (slots.data?.length === 0 ? 'The doctor doesn’t work that day' : undefined);

    return (
        <>
            <TextField
                label="Date"
                type="date"
                required
                value={day}
                disabled={!doctorId}
                onChange={(e) => {
                    setDay(e.target.value);
                    onChange('');
                }}
                slotProps={{inputLabel: {shrink: true}, htmlInput: {min: toDayValue(new Date())}}}
            />
            <TextField
                label="Time"
                select
                required
                value={value}
                disabled={!day || slots.isPending}
                onChange={(e) => onChange(e.target.value)}
                error={!!error || !!slots.error}
                helperText={error ?? hint}
                slotProps={nativeSelect}
            >
                <option value="" disabled/>
                {slots.data?.map((s) => (
                    <option key={s.start} value={s.start} disabled={!s.free}>
                        {formatTime(s.start)}
                        {s.free ? '' : ' (unavailable)'}
                    </option>
                ))}
            </TextField>
        </>
    );
}
