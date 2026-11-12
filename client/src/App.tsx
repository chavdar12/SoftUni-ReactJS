import {Navigate, Route, Routes} from 'react-router';
import {CircularProgress} from '@mui/material';
import {useAuth} from './auth/useAuth';
import RequireRole, {homeFor} from './auth/RequireRole';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import NotFound from './pages/NotFound';
import * as Admin from './pages/admin/pages';
import * as Doctor from './pages/doctor/pages';
import * as Patient from './pages/patient/pages';
import BookAppointmentForm from './pages/patient/BookAppointmentForm';
import ProfilePage from './pages/ProfilePage';
import SecurityPage from './pages/SecurityPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

const links = {
    admin: [
        {to: '/admin/dashboard', label: 'Dashboard'},
        {to: '/admin/doctors', label: 'Doctors'},
        {to: '/admin/patients', label: 'Patients'},
        {to: '/admin/appointments', label: 'Appointments'},
        {to: '/admin/prescriptions', label: 'Prescriptions'},
    ],
    doctor: [
        {to: '/doctor/appointments', label: 'Appointments'},
        {to: '/doctor/schedule', label: 'Schedule'},
        {to: '/doctor/prescriptions', label: 'Prescriptions'},
    ],
    patient: [
        {to: '/patient/book', label: 'Book'},
        {to: '/patient/appointments', label: 'Appointments'},
        {to: '/patient/prescriptions', label: 'Prescriptions'},
        {to: '/patient/history', label: 'History'},
    ],
};

function Home() {
    const {loading, profile} = useAuth();
    if (loading) return <CircularProgress sx={{m: 4}} aria-label="Loading"/>;
    return <Navigate to={homeFor(profile?.role)} replace/>;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/login" element={<Login/>}/>
            <Route path="/signup" element={<Signup/>}/>
            <Route path="/forgot-password" element={<ForgotPassword/>}/>
            <Route path="/reset-password" element={<ResetPassword/>}/>

            <Route path="/admin" element={<RequireRole role="admin"/>}>
                <Route element={<Layout links={links.admin}/>}>
                    <Route index element={<Navigate to="doctors" replace/>}/>
                    <Route path="dashboard" element={<Admin.DashboardPage/>}/>
                    <Route path="doctors" element={<Admin.DoctorsPage/>}/>
                    <Route path="patients" element={<Admin.PatientsPage/>}/>
                    <Route path="appointments" element={<Admin.AppointmentsPage/>}/>
                    <Route path="prescriptions" element={<Admin.PrescriptionsPage/>}/>
                    <Route path="profile" element={<ProfilePage/>}/>
                    <Route path="security" element={<SecurityPage/>}/>
                </Route>
            </Route>

            <Route path="/doctor" element={<RequireRole role="doctor"/>}>
                <Route element={<Layout links={links.doctor}/>}>
                    <Route index element={<Navigate to="appointments" replace/>}/>
                    <Route path="appointments" element={<Doctor.AppointmentsPage/>}/>
                    <Route path="schedule" element={<Doctor.SchedulePage/>}/>
                    <Route path="prescriptions" element={<Doctor.PrescriptionsPage/>}/>
                    <Route path="profile" element={<ProfilePage/>}/>
                    <Route path="security" element={<SecurityPage/>}/>
                </Route>
            </Route>

            <Route path="/patient" element={<RequireRole role="patient"/>}>
                <Route element={<Layout links={links.patient}/>}>
                    <Route index element={<Navigate to="book" replace/>}/>
                    <Route path="book" element={<BookAppointmentForm/>}/>
                    <Route path="appointments" element={<Patient.AppointmentsPage/>}/>
                    <Route path="prescriptions" element={<Patient.PrescriptionsPage/>}/>
                    <Route path="history" element={<Patient.HistoryPage/>}/>
                    <Route path="profile" element={<ProfilePage/>}/>
                    <Route path="security" element={<SecurityPage/>}/>
                </Route>
            </Route>

            <Route path="*" element={<NotFound/>}/>
        </Routes>
    );
}
