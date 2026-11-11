import {Navigate, Outlet} from 'react-router';
import {CircularProgress} from '@mui/material';
import {useAuth} from './AuthProvider';

export const homeFor = (role) =>
    ({admin: '/admin/doctors', doctor: '/doctor/appointments', patient: '/patient/book'})[role] ?? '/login';

/** Renders child routes only for a user whose profile has `role`; otherwise redirects. */
export default function RequireRole({role}) {
    const {loading, profile} = useAuth();

    if (loading) return <CircularProgress sx={{m: 4}} aria-label="Loading"/>;
    if (profile?.role !== role) return <Navigate to={homeFor(profile?.role)} replace/>;
    return <Outlet/>;
}
