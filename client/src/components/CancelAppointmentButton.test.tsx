import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithProviders} from '@/test/render';
import {http} from '@/api/client';
import CancelAppointmentButton from './CancelAppointmentButton';
import type {Appointment} from '@/api/types';

vi.mock('@/api/client', () => ({http: {patch: vi.fn()}}));

test('sends the optional reason and shows server errors', async () => {
    vi.mocked(http.patch).mockRejectedValueOnce(new Error('Appointments can only be changed up to 2 hours before they start'));
    renderWithProviders(<CancelAppointmentButton appointment={{id: 'a1'} as Appointment}/>);

    await userEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    await userEvent.type(screen.getByLabelText(/reason/i), 'Feeling better');
    await userEvent.click(screen.getByRole('button', {name: 'Yes, cancel'}));

    expect(await screen.findByText(/up to 2 hours/)).toBeInTheDocument();
    expect(http.patch).toHaveBeenCalledWith('/appointments/a1/cancel', {reason: 'Feeling better'});
});
