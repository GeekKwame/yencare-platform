import { expect, test } from '@playwright/test';
import { DOCTOR, loginStaff, RECEPTIONIST } from '../helpers/auth-helper.js';
import {
  accraDateFromToday,
  cleanupCreatedFixtures,
  closeDb,
  createAppointmentFixture,
  dbSkipReason,
  staffToken,
} from '../helpers/db-helper.js';

const API = 'http://localhost:4000/api';

const OTHER_DOCTOR = {
  staffId: 'stf_04',
  name: 'Dr. Ama Serwaa',
  password: 'yencare',
  role: 'DOCTOR',
};

const KWAME_SEEDED = 'YC-4821';
const AMA_SEEDED = 'YC-2002';

const PROJECT_DIGIT = { chromium: 1, firefox: 2, webkit: 3 };

function rosterCard(page, reference) {
  return page.locator('[id^="staff-appt-"]').filter({ hasText: reference });
}

async function openRoster(page) {
  await page.getByRole('button', { name: 'Appointments Roster' }).click();
  await expect(page.getByRole('heading', { name: 'Appointments Roster' })).toBeVisible();
}

async function amaFixture(testInfo, testDigit) {
  const projectDigit = PROJECT_DIGIT[testInfo.project.name] ?? 9;
  const repeat = testInfo.repeatEachIndex % 10;
  return createAppointmentFixture({
    referenceCode: `YC-9${repeat}${projectDigit}${testDigit}`,
    date: accraDateFromToday(0),
    time: `${String(6 + repeat).padStart(2, '0')}:${projectDigit}${testDigit}`,
  });
}

test.describe('doctor isolation', () => {
  test.skip(Boolean(dbSkipReason), dbSkipReason ?? '');

  test.afterEach(async () => {
    await cleanupCreatedFixtures();
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test("the roster API returns a doctor's patient only to that doctor and the desk", async ({ request }, testInfo) => {
    const fixture = await amaFixture(testInfo, 1);

    async function roster(credentials) {
      const token = await staffToken(request, credentials);
      const response = await request.get(
        `${API}/appointments?date=${fixture.date}&clinicSite=students-clinic&clinicianId=${fixture.clinicianId}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      expect(response.status()).toBe(200);
      return (await response.json()).map((appointment) => appointment.referenceCode);
    }

    const kwame = await roster(DOCTOR);
    expect(kwame).toContain(KWAME_SEEDED);
    expect(kwame).not.toContain(fixture.referenceCode);
    expect(kwame).not.toContain(AMA_SEEDED);

    const ama = await roster(OTHER_DOCTOR);
    expect(ama).toContain(fixture.referenceCode);
    expect(ama).not.toContain(KWAME_SEEDED);

    const desk = await roster(RECEPTIONIST);
    expect(desk).toEqual(expect.arrayContaining([fixture.referenceCode, KWAME_SEEDED, AMA_SEEDED]));
  });

  test("a doctor's roster does not show another doctor's patients", async ({ page }, testInfo) => {
    const fixture = await amaFixture(testInfo, 2);

    await loginStaff(page, DOCTOR);
    await openRoster(page);

    await expect(rosterCard(page, KWAME_SEEDED)).toBeVisible();
    await expect(rosterCard(page, fixture.referenceCode)).toHaveCount(0);
    await expect(rosterCard(page, AMA_SEEDED)).toHaveCount(0);
  });

  test('the other doctor sees their own patient and not the first doctor\'s', async ({ page }, testInfo) => {
    const fixture = await amaFixture(testInfo, 3);

    await loginStaff(page, OTHER_DOCTOR);
    await openRoster(page);

    await expect(rosterCard(page, fixture.referenceCode)).toBeVisible();
    await expect(rosterCard(page, KWAME_SEEDED)).toHaveCount(0);
  });
});
