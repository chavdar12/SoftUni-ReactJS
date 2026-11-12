import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithProviders} from '@/test/render';
import {http, setAccessToken} from '@/api/client';
import Login from './Login';

vi.mock('@/api/client', () => ({http: {post: vi.fn()}, setAccessToken: vi.fn()}));
vi.mock('@/auth/useAuth', () => ({useAuth: () => ({loading: false, profile: null})}));

async function signIn() {
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@x.co');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret1');
    await userEvent.click(screen.getByRole('button', {name: 'Sign in'}));
}

test('asks for the second step, then signs in with an emailed code', async () => {
    vi.mocked(http.post).mockImplementation(async (url: string) => {
        if (url === '/auth/login') return {data: {mfaRequired: true, mfaToken: 't1', methods: ['totp', 'email']}};
        if (url === '/auth/mfa/email') return {data: undefined};
        if (url === '/auth/mfa') return {data: {accessToken: 'at', user: {id: 'u1'}}};
        throw new Error(url);
    });
    renderWithProviders(<Login/>);
    await signIn();

    expect(await screen.findByText(/Two-step verification is on/)).toBeInTheDocument();
    expect(setAccessToken).not.toHaveBeenCalled(); // no session after the password alone

    await userEvent.click(screen.getByRole('tab', {name: 'Email code'}));
    await userEvent.click(screen.getByRole('button', {name: 'Email me a code'}));
    expect(await screen.findByText('Code sent. Check your email.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', {name: 'Verify'}));

    await vi.waitFor(() => expect(setAccessToken).toHaveBeenCalledWith('at'));
    expect(http.post).toHaveBeenCalledWith('/auth/mfa/email', {mfaToken: 't1'});
    expect(http.post).toHaveBeenCalledWith('/auth/mfa', {mfaToken: 't1', method: 'email', code: '123456'});
});

test('shows a wrong authenticator code', async () => {
    vi.mocked(http.post).mockImplementation(async (url: string) => {
        if (url === '/auth/login') return {data: {mfaRequired: true, mfaToken: 't1', methods: ['totp']}};
        throw new Error('Wrong code');
    });
    renderWithProviders(<Login/>);
    await signIn();

    await userEvent.type(await screen.findByLabelText(/6-digit code/i), '000000');
    await userEvent.click(screen.getByRole('button', {name: 'Verify'}));
    expect(await screen.findByText('Wrong code')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument(); // one method: no tabs
});
