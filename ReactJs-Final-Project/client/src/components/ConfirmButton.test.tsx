import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmButton from './ConfirmButton';

test('calls onConfirm only after Yes', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmButton question="Sure?" onConfirm={onConfirm}>Delete</ConfirmButton>);

    await userEvent.click(screen.getByRole('button', {name: 'Delete'}));
    await userEvent.click(screen.getByRole('button', {name: 'No'}));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Sure?')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', {name: 'Delete'}));
    await userEvent.click(screen.getByRole('button', {name: 'Yes'}));
    expect(onConfirm).toHaveBeenCalledOnce();
});
