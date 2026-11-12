import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router';
import RequireRole from './RequireRole';
import {useAuth} from './useAuth';

vi.mock('./useAuth', () => ({useAuth: vi.fn()}));

const renderAt = (auth: object) => {
    vi.mocked(useAuth).mockReturnValue(auth as ReturnType<typeof useAuth>);
    render(
        <MemoryRouter initialEntries={['/admin']}>
            <Routes>
                <Route path="/admin" element={<RequireRole role="admin"/>}>
                    <Route index element={<p>admin area</p>}/>
                </Route>
                <Route path="/login" element={<p>login page</p>}/>
                <Route path="/patient/book" element={<p>patient home</p>}/>
            </Routes>
        </MemoryRouter>,
    );
};

test('lets the matching role through', () => {
    renderAt({loading: false, profile: {role: 'admin'}});
    expect(screen.getByText('admin area')).toBeInTheDocument();
});

test('sends signed-out users to login', () => {
    renderAt({loading: false, profile: null});
    expect(screen.getByText('login page')).toBeInTheDocument();
});

test('sends other roles to their own home', () => {
    renderAt({loading: false, profile: {role: 'patient'}});
    expect(screen.getByText('patient home')).toBeInTheDocument();
});

test('waits while auth is loading', () => {
    renderAt({loading: true, profile: null});
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
});
