import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithProviders} from '../../test/render';
import {http} from '../../api/client';
import BookAppointmentForm from './BookAppointmentForm';

const doctors = [
    {id: 'd1', name: 'Dr Heart', specialization: 'Cardiologist', roomNumber: 3},
    {id: 'd2', name: 'Dr Skin', specialization: 'Dermatologist', roomNumber: 5},
];

vi.mock('../../api/client', () => ({
    http: {get: vi.fn(), post: vi.fn()},
    idempotencyKey: () => 'k1',
}));

test('filters doctors by specialization and books the chosen one', async () => {
    vi.mocked(http.get).mockResolvedValue({data: doctors});
    vi.mocked(http.post).mockResolvedValue({data: {}});
    renderWithProviders(<BookAppointmentForm/>);

    expect(screen.getByLabelText(/doctor/i)).toBeDisabled();
    await screen.findByRole('option', {name: 'Dermatologist'});
    await userEvent.selectOptions(screen.getByLabelText(/specialization/i), 'Dermatologist');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('Dr Skin (room 5)');
    expect(options).not.toContain('Dr Heart (room 3)');

    await userEvent.selectOptions(screen.getByLabelText(/doctor/i), 'd2');
    await userEvent.type(screen.getByLabelText(/date and time/i), '2099-12-01T10:30');
    await userEvent.click(screen.getByRole('button', {name: 'Book appointment'}));

    expect(await screen.findByText('Appointment booked.')).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith(
        '/appointments',
        {doctorId: 'd2', date: new Date('2099-12-01T10:30').toISOString()},
        {headers: {'Idempotency-Key': 'k1'}},
    );
});

test('rejects dates in the past', async () => {
    vi.mocked(http.get).mockResolvedValue({data: doctors});
    renderWithProviders(<BookAppointmentForm/>);

    await screen.findByRole('option', {name: 'Cardiologist'});
    await userEvent.selectOptions(screen.getByLabelText(/specialization/i), 'Cardiologist');
    await userEvent.selectOptions(screen.getByLabelText(/doctor/i), 'd1');
    await userEvent.type(screen.getByLabelText(/date and time/i), '2001-01-01T10:30');
    await userEvent.click(screen.getByRole('button', {name: 'Book appointment'}));

    expect(await screen.findByText('Must be in the future')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
});
