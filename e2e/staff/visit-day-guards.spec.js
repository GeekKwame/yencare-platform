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
  FIXTURE_TAG,
  getAppointment,
  getDb,
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


function clock12(hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number);
  return `${((hour + 11) % 12) + 1}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function visitDayPattern(date) {
  return new RegExp(`\\w{3} ${Number(date.slice(8))} \\w{3,4}`);
}

async function deskApi(request) {
  const token = await staffToken(request, RECEPTIONIST);
  return { Authorization: `Bearer ${token}` };
}

function rosterCard(page, reference) {
  return page.locator('[id^="staff-appt-"]').filter({ hasText: reference });
}


function feedback(page, text) {
  return page.getByText(text).first();
}

async function openBookingAsPatient(page, reference) {
  await page.goto(`/appointments?ref=${reference}`);
  await page.getByLabel(/Booking Phone Number/i).fill(await patientPhone());
  await page.getByRole('button', { name: /Find Appointment/i }).click();
}

async function openRosterForDate(page, date) {
  await page.getByLabel('Visit date').fill(date);
  await page.getByRole('button', { name: /^Roster \(/ }).click();
}

const issuedOtpIds = [];

async function issueRescheduleOtp(appointment, code = '4826') {
  const db = await getDb();
  const now = new Date();
  const { insertedId } = await db.collection('appointment_otps').insertOne({
    appointmentId: appointment._id,
    referenceCode: appointment.referenceCode,
    action: 'RESCHEDULE',
    phone: await patientPhone(),
    code,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    attempts: 0,
    consumed: false,
    [FIXTURE_TAG]: true,
    createdAt: now,
    updatedAt: now,
  });
  issuedOtpIds.push(insertedId);
  return code;
}

test.describe('visit-day check-in and no-show guards', () => {
  test.skip(Boolean(dbSkipReason), dbSkipReason ?? '');

  test.afterEach(async () => {
    if (issuedOtpIds.length > 0) {
      const db = await getDb();
      await db.collection('appointment_otps').deleteMany({ _id: { $in: issuedOtpIds.splice(0) } });
    }
    await cleanupCreatedFixtures();
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test('1 · reception check-in is disabled with the reason for a future-dated booking, and the API refuses it', async ({ page, request }) => {
    const date = accraDateFromToday(1);
    const fixture = await createAppointmentFixture({ referenceCode: 'YC-9501', date, time: '13:07' });

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    const checkIn = rosterCard(page, 'YC-9501').getByRole('button', { name: 'Check In', exact: true });
    await expect(checkIn).toBeDisabled();
    const reason = new RegExp(`Check-in opens on ${visitDayPattern(date).source}\\.`);
    await expect(rosterCard(page, 'YC-9501').getByText(reason)).toBeVisible();
    await expect(checkIn).toHaveAccessibleDescription(reason);

    const response = await request.patch(`${API}/appointments/${fixture._id}/status`, {
      headers: await deskApi(request),
      data: { status: 'CHECKED_IN' },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe(
      `This appointment is for ${date}. Check-in opens on the day of the visit.`,
    );
    expect((await getAppointment('YC-9501')).status).toBe('BOOKED');
  });

  test('2 · patient "I\'ve arrived" is hidden with the opening time for a future-dated booking, and the API refuses it', async ({ page, request }) => {
    const date = accraDateFromToday(1);
    const fixture = await createAppointmentFixture({ referenceCode: 'YC-9502', date, time: '13:19' });

    await openBookingAsPatient(page, 'YC-9502');
    await expect(page.getByText('YC-9502').first()).toBeVisible();
    await expect(page.getByRole('button', { name: "I've arrived" })).toHaveCount(0);
    await expect(
      page.getByText(
        new RegExp(
          `Check-in opens on ${visitDayPattern(date).source} at ${clock12(addMinutesHm(fixture.time, -60))}\\.`,
        ),
      ),
    ).toBeVisible();

    const response = await request.post(`${API}/appointments/YC-9502/arrive`);
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('Check-in opens on the day of the visit.');
    expect((await getAppointment('YC-9502')).status).toBe('BOOKED');
  });

  test('3 · patient "I\'ve arrived" is hidden with the opening time when more than 60 minutes early, and the API refuses it', async ({ page, request }) => {
    const date = accraDateFromToday(0);
    const fixture = await createAppointmentFixture({
      referenceCode: 'YC-9503',
      date,
      time: todayTimeOrSkip(OFFSETS.earlyArrival),
    });

    await openBookingAsPatient(page, 'YC-9503');
    await expect(page.getByText('YC-9503').first()).toBeVisible();
    await expect(page.getByRole('button', { name: "I've arrived" })).toHaveCount(0);
    await expect(
      page.getByText(`Check-in opens at ${clock12(addMinutesHm(fixture.time, -60))}.`),
    ).toBeVisible();

    const response = await request.post(`${API}/appointments/YC-9503/arrive`);
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe(
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

    await openBookingAsPatient(page, 'YC-9504');
    await page.getByRole('button', { name: "I've arrived" }).click();

    await expect(page).toHaveURL(/\/queue\?ref=YC-9504/);
    expect((await getAppointment('YC-9504')).status).toBe('CHECKED_IN');
  });

  test('5 · patient more than 15 minutes late sees "see reception" instead of "I\'ve arrived", and the API refuses it', async ({ page, request }) => {
    const date = accraDateFromToday(0);
    await createAppointmentFixture({
      referenceCode: 'YC-9505',
      date,
      time: todayTimeOrSkip(OFFSETS.lateArrival),
    });

    await openBookingAsPatient(page, 'YC-9505');
    await expect(page.getByText('YC-9505').first()).toBeVisible();
    await expect(page.getByRole('button', { name: "I've arrived" })).toHaveCount(0);
    await expect(page.getByText("You're past your time, please see reception.")).toBeVisible();

    const response = await request.post(`${API}/appointments/YC-9505/arrive`);
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain(
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

    const otpCode = await issueRescheduleOtp(appointment);
    const response = await request.patch(`${API}/appointments/YC-9507/reschedule`, {
      data: { newSlotId: String(startedSlot._id), otpCode, phone: await patientPhone() },
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

  test('7b · rescheduling with only the booking phone, and no OTP, is refused', async ({ request }) => {
    test.skip(
      !(await supportsTransactions()),
      'rescheduleAppointment runs in a Mongo transaction; point E2E_MONGODB_URI at a replica set to cover this guard',
    );

    const appointment = await createAppointmentFixture({
      referenceCode: 'YC-9570',
      date: accraDateFromToday(1),
      time: '13:53',
    });
    const openSlot = await createFreeSlotFixture({ date: accraDateFromToday(1), time: '14:47' });

    const response = await request.patch(`${API}/appointments/YC-9570/reschedule`, {
      data: { newSlotId: String(openSlot._id), phone: await patientPhone() },
    });

    expect(response.status()).toBe(403);
    expect((await response.json()).error).toBe(
      'A valid OTP verification code (otpCode) is required to reschedule this appointment unless initiated by staff.',
    );

    const after = await getAppointment('YC-9570');
    expect(after.appointmentTime).toBe(appointment.time);
    expect(String(after.timeSlotId)).toBe(String(appointment.timeSlotId));
    expect((await getSlot(openSlot._id)).isBooked).toBe(false);
  });

  test('8 · reception no-show is disabled with the reason for a future-dated booking, and the API refuses it', async ({ page, request }) => {
    const date = accraDateFromToday(1);
    const fixture = await createAppointmentFixture({ referenceCode: 'YC-9508', date, time: '13:31' });

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    const noShow = rosterCard(page, 'YC-9508').getByRole('button', { name: 'No-Show' });
    await expect(noShow).toBeDisabled();
    const reason = new RegExp(
      `No-show is available from ${clock12(addMinutesHm(fixture.time, LATE_GRACE_MINUTES))} on ${visitDayPattern(date).source}\\.`,
    );
    await expect(rosterCard(page, 'YC-9508').getByText(reason)).toBeVisible();
    await expect(noShow).toHaveAccessibleDescription(reason);

    const response = await request.post(`${API}/queue/no-show`, {
      headers: await deskApi(request),
      data: { appointmentId: String(fixture._id) },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain(
      'It cannot be marked as a no-show before the day of the visit.',
    );
    expect((await getAppointment('YC-9508')).status).toBe('BOOKED');
    expect((await getSlot(fixture.timeSlotId)).isBooked).toBe(true);
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

  test('11 · reception no-show is disabled with the reason while the patient is still inside the grace period, and the API refuses it', async ({ page, request }) => {
    const date = accraDateFromToday(0);
    const fixture = await createAppointmentFixture({
      referenceCode: 'YC-9511',
      date,
      time: todayTimeOrSkip(OFFSETS.noShowInsideGrace),
    });
    const graceEnds = addMinutesHm(fixture.time, LATE_GRACE_MINUTES);

    await loginStaff(page, RECEPTIONIST);
    await openRosterForDate(page, date);
    const noShow = rosterCard(page, 'YC-9511').getByRole('button', { name: 'No-Show' });
    await expect(noShow).toBeDisabled();
    const reason = `The patient can still arrive until ${clock12(graceEnds)}. No-show is available after that.`;
    await expect(rosterCard(page, 'YC-9511').getByText(reason)).toBeVisible();
    await expect(noShow).toHaveAccessibleDescription(reason);

    const response = await request.post(`${API}/queue/no-show`, {
      headers: await deskApi(request),
      data: { appointmentId: String(fixture._id) },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe(
      `The patient can still arrive until ${graceEnds}. Mark as no-show after that.`,
    );
    expect((await getAppointment('YC-9511')).status).toBe('BOOKED');
    expect((await getSlot(fixture.timeSlotId)).isBooked).toBe(true);
  });

  test('13 · "Check In to Queue" is disabled with the reason for a future-dated arrival on Roster and Today, and the API refuses it', async ({ page, request }) => {
    const date = accraDateFromToday(1);
    const fixture = await createAppointmentFixture({
      referenceCode: 'YC-9513',
      date,
      time: '11:23',
      status: 'CHECKED_IN',
    });
    const reason = new RegExp(`Check-in opens on ${visitDayPattern(date).source}\\.`);

    await loginStaff(page, RECEPTIONIST);
    await page.getByLabel('Visit date').fill(date);
    const today = page.locator('section').filter({ hasText: /Waiting at reception/ });
    const todayRow = today.locator('div.rounded-xl').filter({ hasText: 'YC-9513' });
    const todayButton = todayRow.getByRole('button', { name: /Check In to Queue/i });
    await expect(todayButton).toBeDisabled();
    await expect(todayRow.getByText(reason)).toBeVisible();
    await expect(todayButton).toHaveAccessibleDescription(reason);

    await page.getByRole('button', { name: /^Roster \(/ }).click();
    const rosterButton = rosterCard(page, 'YC-9513').getByRole('button', { name: 'Check In to Queue' });
    await expect(rosterButton).toBeDisabled();
    await expect(rosterCard(page, 'YC-9513').getByText(reason)).toBeVisible();
    await expect(rosterButton).toHaveAccessibleDescription(reason);

    const response = await request.patch(`${API}/appointments/${fixture._id}/status`, {
      headers: await deskApi(request),
      data: { status: 'WAITING' },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe(
      `This appointment is for ${date}. Check-in opens on the day of the visit.`,
    );
    const after = await getAppointment('YC-9513');
    expect(after.status).toBe('CHECKED_IN');
    expect(after.queueToken ?? null).toBeNull();
  });

  test('15 · a slow response for the previous date never replaces the roster for the newly chosen date', async ({ page }) => {
    const today = accraDateFromToday(0);
    const tomorrow = accraDateFromToday(1);
    await createAppointmentFixture({ referenceCode: 'YC-9515', date: tomorrow, time: '10:53' });

    let releaseToday;
    const todayHeld = new Promise((resolve) => {
      releaseToday = resolve;
    });
    let heldOnce = false;
    await page.route(/\/api\/appointments\?/, async (route) => {
      const url = new URL(route.request().url());
      if (!heldOnce && url.searchParams.get('date') === today) {
        heldOnce = true;
        await todayHeld;
      }
      await route.continue();
    });

    await loginStaff(page, RECEPTIONIST);
    const tomorrowLoaded = page.waitForResponse(
      (response) => response.url().includes('/api/appointments?') && response.url().includes(`date=${tomorrow}`),
    );
    await openRosterForDate(page, tomorrow);
    await tomorrowLoaded;
    await expect(rosterCard(page, 'YC-9515')).toBeVisible();

    const staleLoaded = page.waitForResponse(
      (response) => response.url().includes('/api/appointments?') && response.url().includes(`date=${today}`),
    );
    releaseToday();
    await staleLoaded;
    await page.waitForTimeout(500);

    await expect(rosterCard(page, 'YC-9515')).toBeVisible();
    await expect(page.getByText(`${tomorrow} ·`).first()).toBeVisible();
    await expect(page.getByText(`${today} ·`)).toHaveCount(0);
  });

  test('14 · "I\'ve arrived" is hidden outside the arrival window on the booking page and Clinic Activity', async ({ page }) => {
    const date = accraDateFromToday(1);
    const fixture = await createAppointmentFixture({ referenceCode: 'YC-9514', date, time: '10:41' });
    const reason = new RegExp(
      `Check-in opens on ${visitDayPattern(date).source} at ${clock12(addMinutesHm(fixture.time, -60))}\\.`,
    );

    await openBookingAsPatient(page, 'YC-9514');
    await expect(page.getByText('YC-9514').first()).toBeVisible();
    await expect(page.getByRole('button', { name: "I've arrived" })).toHaveCount(0);
    await expect(page.getByText(reason)).toBeVisible();

    await page.goto('/clinic-activity?ref=YC-9514');
    await expect(page.getByText('YC-9514').first()).toBeVisible();
    await expect(page.getByRole('button', { name: "I've arrived" })).toHaveCount(0);
    await expect(page.getByText(reason)).toBeVisible();
    expect((await getAppointment('YC-9514')).status).toBe('BOOKED');
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
