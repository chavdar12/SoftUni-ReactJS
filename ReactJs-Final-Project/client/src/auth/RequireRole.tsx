import {Navigate, Outlet} from 'react-router';
import {CircularProgress} from '@mui/material';
import type {Role} from '../api/types';
import {useAuth} from './useAuth';

const homes: Record<Role, string> = {admin: '/admin/doctors', doctor: '/doctor/appointments', patient: '/patient/book'};
export const homeFor = (role?: Role) => (role ? homes[role] : '/login');

/** Renders child routes only for a user whose profile has `role`; otherwise redirects. */
export default function RequireRole({role}: {role: Role}) {
    const {loading, profile} = useAuth();

    if (loading) return <CircularProgress sx={{m: 4}} aria-label="Loading"/>;
    if (profile?.role !== role) return <Navigate to={homeFor(profile?.role)} replace/>;
    return <Outlet/>;
}
