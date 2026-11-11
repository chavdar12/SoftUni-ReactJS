import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import Login from './Login';
import Signup from './Signup';
import {login, signUpPatient} from '../../api';

vi.mock('../../api', () => ({login: vi.fn(), logout: vi.fn(), signUpPatient: vi.fn()}));
vi.mock('../../auth/AuthProvider', () => ({useAuth: () => ({user: null, profile: null})}));

const renderPage = (page) => render(<MemoryRouter>{page}</MemoryRouter>);

test('login submits credentials and shows errors', async () => {
    login.mockRejectedValue(new Error('Wrong password'));
    renderPage(<Login/>);

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret1');
    await userEvent.click(screen.getByRole('button', {name: 'Sign in'}));

    expect(login.mock.calls[0][0]).toEqual({email: 'a@b.co', password: 'secret1'});
    expect(await screen.findByText('Wrong password')).toBeInTheDocument();
});

test('signup rejects mismatched passwords without calling the API', async () => {
    renderPage(<Signup/>);

    await userEvent.type(screen.getByLabelText(/full name/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/phone/i), '0888123456');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret2');
    await userEvent.click(screen.getByRole('button', {name: 'Sign up'}));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(signUpPatient).not.toHaveBeenCalled();
});
