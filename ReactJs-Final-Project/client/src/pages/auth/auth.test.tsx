import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithProviders} from '@/test/render';
import {http} from '@/api/client';
import Login from './Login';
import Signup from './Signup';

vi.mock('@/api/client', () => ({http: {post: vi.fn()}, setAccessToken: vi.fn()}));
vi.mock('@/auth/useAuth', () => ({useAuth: () => ({loading: false, profile: null})}));

test('login submits credentials and shows server errors', async () => {
    vi.mocked(http.post).mockRejectedValue(new Error('Invalid email or password'));
    renderWithProviders(<Login/>);

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret1');
    await userEvent.click(screen.getByRole('button', {name: 'Sign in'}));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith('/auth/login', {email: 'a@b.co', password: 'secret1'});
});

test('signup validates fields without calling the API', async () => {
    renderWithProviders(<Signup/>);

    await userEvent.type(screen.getByLabelText(/full name/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/phone/i), '0888123456');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret2');
    await userEvent.click(screen.getByRole('button', {name: 'Sign up'}));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
});
