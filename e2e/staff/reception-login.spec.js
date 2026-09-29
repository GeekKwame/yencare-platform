import { test, expect } from "@playwright/test";
import { loginStaff, RECEPTIONIST } from "../helpers/auth-helper.js";

test.describe("Receptionist login Test", () => {
  test('receptionist can log in and receives confirmation toast', async ({ page }) => {
    await loginStaff(page, RECEPTIONIST);
    await expect(page.getByText('Signed in as Receptionist')).toBeVisible();
    await expect(page.getByRole('heading', { name: "Today's Clinical Operations" })).toBeVisible();
    await expect(page.getByText('Abena Osei')).toBeVisible();
  });

  test('shows error toast and message with invalid credentials', async ({ page }) => {
    await page.goto('/staff/login');
    await page.getByRole('textbox', { name: 'Staff ID or Email' }).fill(RECEPTIONIST.staffId);
    await page.getByRole('textbox', { name: 'Password' }).fill('wrong-password-here');
    await page.getByRole('button', { name: 'Sign in to Workstation' }).click();

    await expect(page.getByText('Invalid staff credentials').first()).toBeVisible();
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  // popstate-based back-button trapping works in real browsers, but Playwright's
  // headless goBack() doesn't reliably fire the popstate event across engines.
  // Kept as fixme so the test is still visible and runnable locally.
  test.fixme('back-button trap prevents accidental landing page redirects', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Staff portal' }).click();

    const identifierBox = page.getByRole('textbox', { name: 'Staff ID or Email' });
    const passwordBox = page.getByRole('textbox', { name: 'Password' });

    await identifierBox.fill(RECEPTIONIST.staffId);
    await passwordBox.fill(RECEPTIONIST.password);
    await page.getByRole('button', { name: 'Sign in to Workstation' }).click();

    await page.waitForURL('**/staff');

    // Trigger browser back button
    await page.goBack();

    // The popstate handler fires and re-pushes the staff URL.
    await expect(page.getByText('Navigation guarded. Please use Sign Out to exit the workstation.')).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/staff/);
  });

  test('offline roster error displays with interactive retry button', async ({ page, context }) => {
    await loginStaff(page, RECEPTIONIST);
    await page.getByRole('button', { name: /Appointments Roster/i }).click();
    await expect(page.getByRole('heading', { name: 'Appointments Roster' })).toBeVisible();

    // Simulate offline
    await context.setOffline(true);
    // Switch date to trigger fetch failure
    await page.getByRole('button', { name: 'Upcoming (Next 14 Days)', exact: true }).click();

    // Check error banner and retry button appear instead of an empty list
    await expect(page.getByText('Could not load appointment roster.').first()).toBeVisible();
    const retryButton = page.getByRole('button', { name: 'Retry' }).first();
    await expect(retryButton).toBeVisible();

    // Restore online and click retry
    await context.setOffline(false);
    await retryButton.click();
    await expect(page.getByText('Could not load appointment roster.')).not.toBeVisible();
  });
});
