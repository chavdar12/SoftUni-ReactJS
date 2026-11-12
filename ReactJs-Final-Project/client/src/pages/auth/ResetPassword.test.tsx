import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {http} from '@/api/client';
import ResetPassword from './ResetPassword';

vi.mock('@/api/client', () => ({http: {post: vi.fn()}}));

const renderAt = (url: string) =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={[url]}>
                <ResetPassword/>
            </MemoryRouter>
        </QueryClientProvider>,
    );

test('sends the token from the link with the new password', async () => {
    vi.mocked(http.post).mockResolvedValue({});
    renderAt('/reset-password?token=abc');

    await userEvent.type(screen.getByLabelText(/new password/i), 'secret12');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret12');
    await userEvent.click(screen.getByRole('button', {name: 'Set password'}));

    expect(await screen.findByText(/Password changed/)).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith('/auth/reset', {token: 'abc', password: 'secret12'});
});

test('a link without a token can’t be submitted', () => {
    renderAt('/reset-password');
    expect(screen.getByText('This reset link is incomplete.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Set password'})).toBeDisabled();
});
