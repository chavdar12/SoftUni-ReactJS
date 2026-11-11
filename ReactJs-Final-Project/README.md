# HMS client

Hospital management app: patients book appointments, doctors prescribe, admins manage doctors.
React 19 + Vite + MUI + Firebase (Auth + Firestore).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Firebase web config.
3. Deploy `firestore.rules` to your project (`firebase deploy --only firestore:rules`).
4. Sign up once, then in the Firestore console set your `users/{uid}.role` to `admin`.

`npm run dev` · `npm test` · `npm run build`

## Data

- `users/{uid}`: `name, email, role` (`admin | doctor | patient`), plus `phone` (patient) or
  `specialization, roomNumber` (doctor)
- `appointments`: `patientId, patientName, doctorId, doctorName, specialization, roomNumber, date, status`
  (`active | cancelled | done`), `closedBy`
- `prescriptions`: `appointmentId, patientId, patientName, doctorId, doctorName, date, disease, medication`

## Layout

```
src/
  api.js                 all Firebase calls
  useCollection.js       live Firestore list hook
  useSubmit.js           form submit + busy/error state
  auth/                  AuthProvider, RequireRole guard
  components/            DataTable, ListPage, Layout, ConfirmButton, ...
  pages/{auth,admin,doctor,patient}/
```
