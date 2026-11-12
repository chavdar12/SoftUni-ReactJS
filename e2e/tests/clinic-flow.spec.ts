import {expect, type Page, test} from '@playwright/test';

// One run = fresh doctor + patient, so the suite can be re-run against the same database.
const run = Date.now().toString(36);
const doctor = {name: `Dr E2E ${run}`, email: `doc-${run}@e2e.test`, password: 'doctor123'};
const patient = {name: `Patient ${run}`, email: `pat-${run}@e2e.test`, password: 'patient123'};

test.describe.configure({mode: 'serial'});

async function signIn(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', {name: 'Sign in', exact: true}).click();
}

async function signOut(page: Page) {
    await page.getByRole('button', {name: 'Log out'}).click();
    await expect(page).toHaveURL(/\/login$/);
}

test('admin adds a doctor', async ({page}) => {
    await signIn(page, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
    await expect(page).toHaveURL(/\/admin\/doctors$/);

    await page.getByLabel('Name').fill(doctor.name);
    await page.getByLabel('Specialization').selectOption('Neurologist');
    await page.getByLabel('Room').fill('7');
    await page.getByLabel('Email').fill(doctor.email);
    await page.getByLabel(/^Password/).fill(doctor.password);
    await page.getByLabel('Confirm password').fill(doctor.password);
    await page.getByRole('button', {name: 'Add doctor'}).click();

    await expect(page.getByText('Doctor account created.')).toBeVisible();
    await expect(page.getByRole('cell', {name: doctor.name})).toBeVisible();
    await signOut(page);
});

test('patient signs up, books, and the session survives a reload', async ({page}) => {
    await page.goto('/signup');
    await page.getByLabel('Full name').fill(patient.name);
    await page.getByLabel('Email').fill(patient.email);
    await page.getByLabel('Phone').fill('0888123456');
    await page.getByLabel(/^Password/).fill(patient.password);
    await page.getByLabel('Confirm password').fill(patient.password);
    await page.getByRole('button', {name: 'Sign up'}).click();
    await expect(page).toHaveURL(/\/patient\/book$/);

    await page.getByLabel('Specialization').selectOption('Neurologist');
    await page.getByLabel('Doctor').selectOption({label: `${doctor.name} (room 7)`});
    await page.getByRole('textbox', {name: 'Date', exact: true}).fill('2030-01-15'); // a Tuesday: within default hours
    const time = page.getByLabel('Time');
    await expect(time).toBeEnabled();
    await time.selectOption((await time.locator('option:not([disabled])').first().getAttribute('value'))!);
    await page.getByRole('button', {name: 'Book appointment'}).click();
    await expect(page.getByText('Appointment booked.')).toBeVisible();

    // Access token is in memory only: a reload must restore the session from the refresh cookie.
    await page.reload();
    await page.getByRole('link', {name: 'Appointments'}).click();
    await expect(page.getByRole('row', {name: new RegExp(doctor.name)})).toContainText('active');
    await signOut(page);
});

test('doctor prescribes and the patient sees it', async ({page}) => {
    await signIn(page, doctor.email, doctor.password);
    await expect(page).toHaveURL(/\/doctor\/appointments$/);

    await page.getByRole('row', {name: new RegExp(patient.name)}).getByRole('button', {name: 'Prescribe'}).click();
    await page.getByLabel('Diagnosis').fill('Migraine');
    await page.getByLabel('Medication').fill('Rest, water');
    await page.getByRole('button', {name: 'Prescribe'}).click();
    // Done appointments leave the default "Upcoming" tab.
    await page.getByRole('tab', {name: 'All'}).click();
    await expect(page.getByRole('row', {name: new RegExp(patient.name)})).toContainText('done');
    await signOut(page);

    await signIn(page, patient.email, patient.password);
    await page.getByRole('link', {name: 'Prescriptions'}).click();
    await expect(page.getByRole('row', {name: /Migraine/})).toContainText('Rest, water');
});

test('roles are enforced in the UI', async ({page}) => {
    await signIn(page, patient.email, patient.password);
    await expect(page).toHaveURL(/\/patient\/book$/);
    await page.goto('/admin/doctors');
    await expect(page).toHaveURL(/\/patient\/book$/);
});
