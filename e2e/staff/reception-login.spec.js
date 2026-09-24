import { test, expect } from "@playwright/test";
import { loginStaff, RECEPTIONIST } from "../helpers/auth-helper.js";

test.describe("Receptionist login Test", () => {
  test('receptionist can log in', async ({ page }) => {
    await loginStaff(page, RECEPTIONIST);
    await expect(page.getByRole('heading', { name: "Today's Clinical Operations" })).toBeVisible();
    await expect(page.getByText('Abena Osei')).toBeVisible();
  });

  test('shows error message with invalid credentials', async ({ page }) => {
    await page.goto('/staff/login');
    await page.getByRole('textbox', { name: 'Staff ID or Email' }).fill(RECEPTIONIST.staffId);
    await page.getByRole('textbox', { name: 'Password' }).fill('wrong-password-here');
    await page.getByRole('button', { name: 'Sign in to Workstation' }).click();

    await expect(page.getByText('Invalid staff credentials')).toBeVisible();
    await expect(page).toHaveURL(/\/staff\/login/);
  });
});
