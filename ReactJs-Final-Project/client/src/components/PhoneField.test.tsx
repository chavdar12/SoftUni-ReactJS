import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneField from './PhoneField';

test('combines the chosen country code with the typed number', async () => {
    const onChange = vi.fn();
    render(<PhoneField defaultValue="+359888123456" onChange={onChange}/>);

    expect(screen.getByLabelText('Phone')).toHaveValue('888123456');
    await userEvent.selectOptions(screen.getByLabelText('Country code'), 'GB');
    expect(onChange).toHaveBeenLastCalledWith('+44888123456');
    await userEvent.clear(screen.getByLabelText('Phone'));
    await userEvent.type(screen.getByLabelText('Phone'), '07700 900123');
    expect(onChange).toHaveBeenLastCalledWith('+447700900123');
});
