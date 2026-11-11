import {deleteApp, initializeApp} from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getFirestore,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';

const env = import.meta.env;
const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

// --- auth ---
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);
export const login = ({email, password}) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const resetPassword = ({email}) => sendPasswordResetEmail(auth, email);

export async function signUpPatient({name, email, phone, password}) {
    const {user} = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', user.uid), {name, email, phone, role: 'patient'});
}

// A throwaway app instance creates the doctor's login without signing the admin out.
export async function createDoctor({name, email, password, specialization, roomNumber}) {
    const secondary = initializeApp(config, `create-doctor-${Date.now()}`);
    try {
        const {user} = await createUserWithEmailAndPassword(getAuth(secondary), email, password);
        await setDoc(doc(db, 'users', user.uid), {name, email, specialization, roomNumber, role: 'doctor'});
    } finally {
        await deleteApp(secondary);
    }
}

// shortcut: removes the profile only; the Auth login stays (client SDK can't delete other users). Use a Cloud Function + Admin SDK to delete both.
export const deleteDoctor = (id) => deleteDoc(doc(db, 'users', id));

// --- reads ---
export const watchProfile = (uid, cb) => onSnapshot(doc(db, 'users', uid), (s) => cb(s.data() ?? null));

/** Live list of a collection, optionally filtered by `field == value`. Returns the unsubscribe fn. */
export function subscribe(name, field, value, onData, onError) {
    const ref = collection(db, name);
    const q = field ? query(ref, where(field, '==', value)) : ref;
    return onSnapshot(q, (s) => onData(s.docs.map((d) => ({id: d.id, ...d.data()}))), onError);
}

// --- appointments & prescriptions ---
export const bookAppointment = (patient, doctor, date) =>
    addDoc(collection(db, 'appointments'), {
        patientId: patient.uid,
        patientName: patient.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        roomNumber: doctor.roomNumber,
        date,
        status: 'active',
    });

export const cancelAppointment = (id, by) =>
    updateDoc(doc(db, 'appointments', id), {status: 'cancelled', closedBy: by});

export async function prescribe(appointment, {disease, medication}) {
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'prescriptions')), {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        date: appointment.date,
        disease,
        medication,
    });
    batch.update(doc(db, 'appointments', appointment.id), {status: 'done', closedBy: appointment.doctorName});
    await batch.commit();
}
