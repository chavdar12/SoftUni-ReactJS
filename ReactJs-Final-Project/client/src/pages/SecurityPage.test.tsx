import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithProviders} from '@/test/render';
import {http} from '@/api/client';
import SecurityPage from './SecurityPage';

vi.mock('@/api/client', () => ({http: {get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn()}}));
vi.mock('@simplewebauthn/browser', () => ({browserSupportsWebAuthn: () => true, startRegistration: vi.fn()}));
vi.mock('qrcode', () => ({default: {toDataURL: async () => 'data:image/png;base64,AAAA'}}));

let security = {
    email: 'ana@x.co', emailVerified: false, phone: '+359888123456', phoneVerified: false,
    totpEnabled: false, emailCodeLogin: false,
    passkeys: [{id: 'c1', name: 'Laptop', createdAt: '2030-01-01T10:00:00Z'}],
};

beforeEach(() => {
    vi.mocked(http.get).mockImplementation(async () => ({data: security}));
});

test('verifies the email with a code; email sign-in codes need a verified email', async () => {
    vi.mocked(http.post).mockImplementation(async (url: string) => {
        if (url === '/me/email/verify') security = {...security, emailVerified: true};
        return {data: undefined};
    });
    renderWithProviders(<SecurityPage/>);

    expect(await screen.findByRole('switch', {name: /code sent to my email/i})).toBeDisabled();
    const [emailSend] = screen.getAllByRole('button', {name: 'Send code'});
    await userEvent.click(emailSend);
    expect(await screen.findByText('Code sent to ana@x.co.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', {name: 'Verify'}));

    expect(http.post).toHaveBeenCalledWith('/me/email/verify', {code: '123456'});
    expect(await screen.findByRole('switch', {name: /code sent to my email/i})).toBeEnabled();
});

test('sets up the authenticator: shows the key and QR, confirms with a code', async () => {
    vi.mocked(http.post).mockImplementation(async (url: string) =>
        url === '/me/totp/setup' ? {data: {secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/x'}} : {data: undefined},
    );
    renderWithProviders(<SecurityPage/>);

    await userEvent.click(await screen.findByRole('button', {name: 'Set up authenticator'}));
    expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    expect(await screen.findByAltText(/QR code/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '654321');
    await userEvent.click(screen.getByRole('button', {name: 'Turn on'}));
    expect(http.post).toHaveBeenCalledWith('/me/totp', {code: '654321'});
});

test('lists passkeys and removes one after confirming', async () => {
    renderWithProviders(<SecurityPage/>);
    expect(await screen.findByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText(/never used/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Remove'}));
    await userEvent.click(screen.getByRole('button', {name: 'Yes'}));
    expect(http.delete).toHaveBeenCalledWith('/me/passkeys/c1');
});

test('adding a passkey sends the password first and stops on a wrong one', async () => {
    vi.mocked(http.post).mockRejectedValueOnce(new Error('Wrong password'));
    renderWithProviders(<SecurityPage/>);

    const add = await screen.findByRole('button', {name: 'Add passkey'});
    await userEvent.type(screen.getByLabelText(/name for the new passkey/i), 'Phone');
    expect(add).toBeDisabled(); // no password yet
    await userEvent.type(screen.getByLabelText('Your password'), 'nope');
    await userEvent.click(add);

    expect(await screen.findByText('Wrong password')).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith('/me/passkeys/options', {password: 'nope'});
    expect(http.post).toHaveBeenCalledTimes(1); // never reached registration
    expect(screen.getByLabelText('Your password')).toHaveValue('');
});
