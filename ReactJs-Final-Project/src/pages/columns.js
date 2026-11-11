const dateTime = (d) => (d ? new Date(d).toLocaleString() : '');

export const doctorColumns = [
    {id: 'name', label: 'Name'},
    {id: 'email', label: 'Email'},
    {id: 'specialization', label: 'Specialization'},
    {id: 'roomNumber', label: 'Room'},
];

export const patientColumns = [
    {id: 'name', label: 'Name'},
    {id: 'email', label: 'Email'},
    {id: 'phone', label: 'Phone'},
];

export const appointmentColumns = [
    {id: 'patientName', label: 'Patient'},
    {id: 'doctorName', label: 'Doctor'},
    {id: 'specialization', label: 'Specialization'},
    {id: 'roomNumber', label: 'Room'},
    {id: 'date', label: 'Date', format: dateTime},
    {id: 'status', label: 'Status'},
];

export const prescriptionColumns = [
    {id: 'patientName', label: 'Patient'},
    {id: 'doctorName', label: 'Doctor'},
    {id: 'date', label: 'Date', format: dateTime},
    {id: 'disease', label: 'Diagnosis'},
    {id: 'medication', label: 'Medication'},
];
