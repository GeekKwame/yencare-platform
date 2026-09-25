import { expect, test } from '@playwright/test';
import { loginStaff, RECEPTIONIST } from '../helpers/auth-helper.js';
import {
  accraDateFromToday,
  accraTimeFromNow,
  cleanupCreatedFixtures,
  closeDb,
  createAppointmentFixture,
  createFreeSlotFixture,
  dbSkipReason,
  getAppointment,
  getQueueCounter,
  getSlot,
  patientPhone,
  staffToken,
  supportsTransactions,
} from '../helpers/db-helper.js';
import { accraParts } from '../../backend/src/lib/accraTime.js';
import { LATE_GRACE_MINUTES } from '../../backend/src/services/visitDayGuard.js';

const API = 'http://localhost:4000/api';

const MIDNIGHT_MARGIN_MINUTES = 10;
const DAY_MINUTES = 24 * 60;

const OFFSETS = {
  earlyArrival: 97,
  inWindow: 37,
  lateArrival: -27,
  lateForDesk: -41,
  calledNoShow: -59,
  arrivedNoShow: -23,
  noShowInsideGrace: -Math.max(1, Math.floor(LATE_GRACE_MINUTES / 2)),
  noShowAfterGrace: -(LATE_GRACE_MINUTES + 18),
};


function accraMinutesNow() {
  const { hour, minute } = accraParts(new Date());
  return hour * 60 + minute;
}

function todayTimeOrSkip(offsetMinutes) {
  const now = accraMinutesNow();
  const target = now + offsetMinutes;
  const nearMidnight =
    target < MIDNIGHT_MARGIN_MINUTES ||
    target > DAY_MINUTES - MIDNIGHT_MARGIN_MINUTES ||
    now > DAY_MINUTES - MIDNIGHT_MARGIN_MINUTES;
  const sign = offsetMinutes >= 0 ? '+' : '';
  test.skip(
    nearMidnight,
    `skipped near Accra midnight: needs a same-day appointment at now${sign}${offsetMinutes}m`,
  );
  return accraTimeFromNow(offsetMinutes);
}

function addMinutesHm(hhmm, minutes) {
  const [hour, minute] = hhmm.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}


function rosterCard(page, reference) {
  return page.locator('[id^="staff-appt-"]').filter({ hasText: reference });
}


function feedback(page, text) {
  return page.getByText(text).first();
}

async function openRosterForDate(page, date) {
  await page.getByLabel('Visit date').fill(date);
  await page.getByRole('button', { name: /^Roster \(/ }).click();
}

test.describe('visit-day check-in and no-show guards', () => {
  test.skip(Boolean(dbSkipReason), dbSkipReason ?? '');

  test.afterEach(async () => {
    await cleanupCreatedFixtures();
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test('1 · reception cannot check in a future-dated booking', async ({ page }) => {
    const date = accraDateFromToday(1);
    await createAppointmentFixture({ referenceCode: 'YC-9501', date, time: '13:07' });

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    await rosterCard(page, 'YC-9501')
      .getByRole('button', { name: 'Check In', exact: true })
      .click();

    await expect(
      feedback(page, `This appointment is for ${date}. Check-in opens on the day of the visit.`),
    ).toBeVisible();
    expect((await getAppointment('YC-9501')).status).toBe('BOOKED');
  });

  test('2 · patient cannot self-arrive on a future-dated booking', async ({ page }) => {
    const date = accraDateFromToday(1);
    await createAppointmentFixture({ referenceCode: 'YC-9502', date, time: '13:19' });

    await page.goto('/appointments?ref=YC-9502');
    await page.getByRole('button', { name: "I've arrived" }).click();

    await expect(page.getByRole('alert')).toContainText(
      'Check-in opens on the day of the visit.',
    );
    expect((await getAppointment('YC-9502')).status).toBe('BOOKED');
  });

  test('3 · patient cannot arrive more than 60 minutes early', async ({ page }) => {
    const date = accraDateFromToday(0);
    await createAppointmentFixture({
      referenceCode: 'YC-9503',
      date,
      time: todayTimeOrSkip(OFFSETS.earlyArrival),
    });

    await page.goto('/appointments?ref=YC-9503');
    await page.getByRole('button', { name: "I've arrived" }).click();

    await expect(page.getByRole('alert')).toContainText(
      'Check-in opens 60 minutes before your appointment time.',
    );
    expect((await getAppointment('YC-9503')).status).toBe('BOOKED');
  });

  test('4 · patient arriving inside the window is checked in', async ({ page }) => {
    const date = accraDateFromToday(0);
    await createAppointmentFixture({
      referenceCode: 'YC-9504',
      date,
      time: todayTimeOrSkip(OFFSETS.inWindow),
    });

    await page.goto('/appointments?ref=YC-9504');
    await page.getByRole('button', { name: "I've arrived" }).click();

    await expect(page).toHaveURL(/\/queue\?ref=YC-9504/);
    expect((await getAppointment('YC-9504')).status).toBe('CHECKED_IN');
  });

  test('5 · patient more than 15 minutes late is sent to reception', async ({ page }) => {
    const date = accraDateFromToday(0);
    await createAppointmentFixture({
      referenceCode: 'YC-9505',
      date,
      time: todayTimeOrSkip(OFFSETS.lateArrival),
    });

    await page.goto('/appointments?ref=YC-9505');
    await page.getByRole('button', { name: "I've arrived" }).click();

    await expect(page.getByRole('alert')).toContainText(
      'You are past your appointment time. Please see reception',
    );
    expect((await getAppointment('YC-9505')).status).toBe('BOOKED');
  });

  test('6 · reception can check in a patient who is past the late grace period', async ({ page }) => {
    const date = accraDateFromToday(0);
    await createAppointmentFixture({
      referenceCode: 'YC-9506',
      date,
      time: todayTimeOrSkip(OFFSETS.lateForDesk),
    });

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    await rosterCard(page, 'YC-9506')
      .getByRole('button', { name: 'Check In', exact: true })
      .click();

    await expect(feedback(page, 'Checked in.')).toBeVisible();
    expect((await getAppointment('YC-9506')).status).toBe('CHECKED_IN');
  });

  test('7 · rescheduling onto a slot that already started is refused', async ({ request }) => {
    test.skip(
      !(await supportsTransactions()),
      'rescheduleAppointment runs in a Mongo transaction; point E2E_MONGODB_URI at a replica set to cover this guard',
    );

    test.skip(
      accraMinutesNow() < 30,
      'skipped just after Accra midnight: needs a slot at 00:05 today that has already started',
    );

    const appointment = await createAppointmentFixture({
      referenceCode: 'YC-9507',
      date: accraDateFromToday(1),
      time: '13:43',
    });
    const startedSlot = await createFreeSlotFixture({
      date: accraDateFromToday(0),
      time: '00:05',
    });

    const response = await request.patch(`${API}/appointments/YC-9507/reschedule`, {
      data: { newSlotId: String(startedSlot._id), phone: await patientPhone() },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('That time slot has already started.');


    const after = await getAppointment('YC-9507');
    expect(after.appointmentTime).toBe(appointment.time);
    expect(after.appointmentDate).toBe(appointment.date);
    expect(String(after.timeSlotId)).toBe(String(appointment.timeSlotId));

    const originalSlot = await getSlot(appointment.timeSlotId);
    expect(originalSlot.isBooked).toBe(true);
    expect(String(originalSlot.appointmentId)).toBe(String(appointment._id));

   
    const untouched = await getSlot(startedSlot._id);
    expect(untouched.isBooked).toBe(false);
    expect(untouched.appointmentId).toBeNull();
  });

  test('8 · reception cannot no-show a future-dated booking', async ({ page }) => {
    const date = accraDateFromToday(1);
    await createAppointmentFixture({ referenceCode: 'YC-9508', date, time: '13:31' });

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    await rosterCard(page, 'YC-9508').getByRole('button', { name: 'No-Show' }).click();
    await page.getByRole('button', { name: 'Yes, mark as no-show' }).click();

    await expect(
      feedback(page, 'It cannot be marked as a no-show before the day of the visit.'),
    ).toBeVisible();
    await expect(page.getByText('Marked as no-show')).toBeHidden();
    expect((await getAppointment('YC-9508')).status).toBe('BOOKED');
  });

  test('9 · no-show on the called patient frees the slot and clears the room marker', async ({ request }) => {
    const date = accraDateFromToday(0);
    const fixture = await createAppointmentFixture({
      referenceCode: 'YC-9509',
      date,
      time: todayTimeOrSkip(OFFSETS.calledNoShow),
      status: 'CALLED',
      queued: true,
      activeInRoom: true,
    });

    const before = await getQueueCounter(fixture.roomId, date);
    expect(String(before.activeAppointmentId)).toBe(String(fixture._id));

    const token = await staffToken(request, RECEPTIONIST);
    const response = await request.post(`${API}/queue/no-show`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { appointmentId: String(fixture._id), reason: 'Did not respond when called' },
    });
    expect(response.ok()).toBeTruthy();

    expect((await getAppointment('YC-9509')).status).toBe('NO_SHOW');

    const slot = await getSlot(fixture.timeSlotId);
    expect(slot.isBooked).toBe(false);
    expect(slot.appointmentId).toBeNull();

    const counter = await getQueueCounter(fixture.roomId, date);
    expect(counter.activeAppointmentId).toBeNull();
  });

  test('10 · reception can no-show an arrived patient and the slot is freed', async ({ page }) => {
    const date = accraDateFromToday(0);
    const fixture = await createAppointmentFixture({
      referenceCode: 'YC-9510',
      date,
      time: todayTimeOrSkip(OFFSETS.arrivedNoShow),
      status: 'CHECKED_IN',
    });

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    await rosterCard(page, 'YC-9510').click();

    await page.getByRole('button', { name: 'Mark no-show' }).click();
    await page.getByRole('button', { name: 'Yes, mark as no-show' }).click();

    await expect(page.getByText('Marked as no-show')).toBeVisible();
    expect((await getAppointment('YC-9510')).status).toBe('NO_SHOW');

    const slot = await getSlot(fixture.timeSlotId);
    expect(slot.isBooked).toBe(false);
    expect(slot.appointmentId).toBeNull();
  });

  test('11 · reception cannot no-show a booked patient still inside the grace period', async ({ page }) => {
    const date = accraDateFromToday(0);
    const fixture = await createAppointmentFixture({
      referenceCode: 'YC-9511',
      date,
      time: todayTimeOrSkip(OFFSETS.noShowInsideGrace),
    });
    const graceEnds = addMinutesHm(fixture.time, LATE_GRACE_MINUTES);

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    await rosterCard(page, 'YC-9511').getByRole('button', { name: 'No-Show' }).click();

    const refusal = page.waitForResponse(
      (response) =>
        response.url().includes('/api/queue/no-show') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Yes, mark as no-show' }).click();
    expect((await refusal).status()).toBe(400);

    await expect(
      feedback(page, `The patient can still arrive until ${graceEnds}. Mark as no-show after that.`),
    ).toBeVisible();
    await expect(page.getByText('Marked as no-show')).toBeHidden();
    expect((await getAppointment('YC-9511')).status).toBe('BOOKED');
  });

  test('12 · reception can no-show a booked patient once the grace period has passed', async ({ page }) => {
    const date = accraDateFromToday(0);
    const fixture = await createAppointmentFixture({
      referenceCode: 'YC-9512',
      date,
      time: todayTimeOrSkip(OFFSETS.noShowAfterGrace),
    });

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    await rosterCard(page, 'YC-9512').getByRole('button', { name: 'No-Show' }).click();

    const accepted = page.waitForResponse(
      (response) =>
        response.url().includes('/api/queue/no-show') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Yes, mark as no-show' }).click();
    expect((await accepted).status()).toBe(200);

    await expect(page.getByText('Marked as no-show')).toBeVisible();
    expect((await getAppointment('YC-9512')).status).toBe('NO_SHOW');

    const slot = await getSlot(fixture.timeSlotId);
    expect(slot.isBooked).toBe(false);
    expect(slot.appointmentId).toBeNull();
  });
});
