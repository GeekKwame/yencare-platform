import { test, expect } from "@playwright/test";
import { loginStaff, DOCTOR } from "../helpers/auth-helper.js";

test.describe("Doctor login Test", () => {
  test('doctor can log in and access Room Board', async ({ page }) => {
    await loginStaff(page, DOCTOR);

    await expect(page.getByText('Dr. Kwame Boateng', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Doctor · Room 1')).toBeVisible();

    const roomBoardButton = page.getByRole('button', { name: 'Room Board' });
    await expect(roomBoardButton).toBeVisible();
    await roomBoardButton.click();

    await expect(page.getByRole('heading', { name: 'Call next patient' })).toBeVisible();
    await expect(page.getByText(/bound to Room 1/i)).toBeVisible();
  });
});
