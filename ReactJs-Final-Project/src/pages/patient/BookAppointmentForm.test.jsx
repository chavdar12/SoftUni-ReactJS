import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookAppointmentForm from './BookAppointmentForm';
import {bookAppointment} from '../../api';

const doctors = [
    {id: 'd1', name: 'Dr Heart', specialization: 'Cardiologist', roomNumber: 3},
    {id: 'd2', name: 'Dr Skin', specialization: 'Dermatologist', roomNumber: 5},
];
const patient = {uid: 'p1', name: 'Ana', role: 'patient'};

vi.mock('../../api', () => ({
    bookAppointment: vi.fn().mockResolvedValue(),
    subscribe: (name, field, value, onData) => {
        onData(doctors);
        return () => {
        };
    },
}));
vi.mock('../../auth/AuthProvider', () => ({useAuth: () => ({profile: patient})}));

test('filters doctors by specialization and books the chosen one', async () => {
    render(<BookAppointmentForm/>);
    const doctorSelect = screen.getByLabelText(/doctor/i);
    expect(doctorSelect).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText(/specialization/i), 'Dermatologist');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('Dr Skin (room 5)');
    expect(options).not.toContain('Dr Heart (room 3)');

    await userEvent.selectOptions(screen.getByLabelText(/doctor/i), 'd2');
    await userEvent.type(screen.getByLabelText(/date and time/i), '2026-12-01T10:30');
    await userEvent.click(screen.getByRole('button', {name: 'Book appointment'}));

    expect(bookAppointment).toHaveBeenCalledWith(patient, doctors[1], '2026-12-01T10:30');
    expect(await screen.findByText('Appointment booked.')).toBeInTheDocument();
});
