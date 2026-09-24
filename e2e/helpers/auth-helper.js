import { expect } from '@playwright/test';

export const RECEPTIONIST = {
  staffId: 'stf_01',
  name: 'Abena Osei',
  email: 'abena.osei@yencare.gh',
  password: 'yencare',
  role: 'RECEPTIONIST',
};

export const DOCTOR = {
  staffId: 'stf_02',
  name: 'Dr. Kwame Boateng',
  email: 'kwame.boateng@yencare.gh',
  password: 'yencare',
  role: 'DOCTOR',
};

export const ADMIN = {
  staffId: 'stf_03',
  name: 'Kojo Mensah',
  email: 'kojo.mensah@yencare.gh',
  password: 'yencare',
  role: 'ADMIN',
};



export async function loginStaff(page, credentials) {
  const loginIdentifier = credentials.staffId || credentials.email;
  const password = credentials.password;
  await page.goto('/');

  await page.getByRole('link', { name: 'Staff portal' }).click();

  const identifierBox = page.getByRole('textbox', { name: 'Staff ID or Email' });
  const passwordBox = page.getByRole('textbox', { name: 'Password' });

  await identifierBox.fill(loginIdentifier);
  await expect(identifierBox).toHaveValue(loginIdentifier);

  await passwordBox.fill(password);
  await expect(passwordBox).toHaveValue(password);

  await page.getByRole('button', { name: 'Sign in to Workstation' }).click();

  await page.waitForURL('**/staff');
}