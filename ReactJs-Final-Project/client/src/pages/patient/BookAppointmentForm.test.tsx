import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithProviders} from '@/test/render';
import {http} from '@/api/client';
import BookAppointmentForm from './BookAppointmentForm';

const doctors = [
    {id: 'd1', name: 'Dr Heart', specialization: 'Cardiologist', roomNumber: 3},
    {id: 'd2', name: 'Dr Skin', specialization: 'Dermatologist', roomNumber: 5},
];
const slots = [
    {start: '2099-12-01T08:00:00.000Z', free: false},
    {start: '2099-12-01T08:30:00.000Z', free: true},
];

vi.mock('@/api/client', () => ({
    http: {get: vi.fn(), post: vi.fn()},
    idempotencyKey: () => 'k1',
}));

function fakeApi() {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
        if (url === '/doctors') return {data: doctors};
        if (url === '/ratings') return {data: [{doctorId: 'd2', average: 4.5, count: 2}]};
        if (url === '/appointments/availability') return {data: slots};
        throw new Error(`unexpected ${url}`);
    });
}

test('picks a specialization, doctor and free slot, then books', async () => {
    fakeApi();
    vi.mocked(http.post).mockResolvedValue({data: {}});
    renderWithProviders(<BookAppointmentForm/>);

    expect(screen.getByLabelText(/doctor/i)).toBeDisabled();
    await screen.findByRole('option', {name: 'Dermatologist'});
    await userEvent.selectOptions(screen.getByLabelText(/specialization/i), 'Dermatologist');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('Dr Skin (room 5, ★ 4.5 (2))');
    expect(options).not.toContain('Dr Heart (room 3)');

    await userEvent.selectOptions(screen.getByLabelText(/doctor/i), 'd2');
    await userEvent.type(screen.getByLabelText(/^date/i), '2099-12-01');
    await waitFor(() => expect(screen.getByLabelText(/^time/i)).toBeEnabled());
    expect(http.get).toHaveBeenCalledWith('/appointments/availability', {params: {doctorId: 'd2', day: '2099-12-01'}});
    const [taken, free] = screen.getAllByRole('option').filter((o) => (o as HTMLOptionElement).value.startsWith('2099'));
    expect(taken).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText(/^time/i), (free as HTMLOptionElement).value);
    await userEvent.type(screen.getByLabelText(/reason/i), 'Rash');
    await userEvent.click(screen.getByRole('button', {name: 'Book appointment'}));

    expect(await screen.findByText('Appointment booked.')).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith(
        '/appointments',
        {doctorId: 'd2', date: slots[1].start, reason: 'Rash'},
        {headers: {'Idempotency-Key': 'k1'}},
    );
});

test('requires a time slot', async () => {
    fakeApi();
    renderWithProviders(<BookAppointmentForm/>);

    await screen.findByRole('option', {name: 'Cardiologist'});
    await userEvent.selectOptions(screen.getByLabelText(/specialization/i), 'Cardiologist');
    await userEvent.selectOptions(screen.getByLabelText(/doctor/i), 'd1');
    await userEvent.click(screen.getByRole('button', {name: 'Book appointment'}));

    expect(await screen.findByText('Pick a time')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
});
