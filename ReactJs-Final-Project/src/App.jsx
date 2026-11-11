import {Navigate, Route, Routes} from 'react-router';
import {CircularProgress} from '@mui/material';
import {useAuth} from './auth/AuthProvider';
import RequireRole, {homeFor} from './auth/RequireRole';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import NotFound from './pages/NotFound';
import * as Admin from './pages/admin/pages';
import * as Doctor from './pages/doctor/pages';
import * as Patient from './pages/patient/pages';
import BookAppointmentForm from './pages/patient/BookAppointmentForm';

const links = {
    admin: [
        {to: '/admin/doctors', label: 'Doctors'},
        {to: '/admin/patients', label: 'Patients'},
        {to: '/admin/appointments', label: 'Appointments'},
        {to: '/admin/prescriptions', label: 'Prescriptions'},
    ],
    doctor: [
        {to: '/doctor/appointments', label: 'Appointments'},
        {to: '/doctor/prescriptions', label: 'Prescriptions'},
    ],
    patient: [
        {to: '/patient/book', label: 'Book'},
        {to: '/patient/appointments', label: 'Appointments'},
        {to: '/patient/prescriptions', label: 'Prescriptions'},
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

            <Route path="/admin" element={<RequireRole role="admin"/>}>
                <Route element={<Layout links={links.admin}/>}>
                    <Route index element={<Navigate to="doctors" replace/>}/>
                    <Route path="doctors" element={<Admin.DoctorsPage/>}/>
                    <Route path="patients" element={<Admin.PatientsPage/>}/>
                    <Route path="appointments" element={<Admin.AppointmentsPage/>}/>
                    <Route path="prescriptions" element={<Admin.PrescriptionsPage/>}/>
                </Route>
            </Route>

            <Route path="/doctor" element={<RequireRole role="doctor"/>}>
                <Route element={<Layout links={links.doctor}/>}>
                    <Route index element={<Navigate to="appointments" replace/>}/>
                    <Route path="appointments" element={<Doctor.AppointmentsPage/>}/>
                    <Route path="prescriptions" element={<Doctor.PrescriptionsPage/>}/>
                </Route>
            </Route>

            <Route path="/patient" element={<RequireRole role="patient"/>}>
                <Route element={<Layout links={links.patient}/>}>
                    <Route index element={<Navigate to="book" replace/>}/>
                    <Route path="book" element={<BookAppointmentForm/>}/>
                    <Route path="appointments" element={<Patient.AppointmentsPage/>}/>
                    <Route path="prescriptions" element={<Patient.PrescriptionsPage/>}/>
                </Route>
            </Route>

            <Route path="*" element={<NotFound/>}/>
        </Routes>
    );
}
