import { expect, test } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { RECEPTIONIST } from '../helpers/auth-helper.js';
import { accraParts } from '../../backend/src/lib/accraTime.js';
import {
  accraDateFromToday,
  cleanupCreatedFixtures,
  closeDb,
  createAppointmentFixture,
  dbSkipReason,
  FIXTURE_TAG,
  getDb,
  patientPhone,
  staffToken,
} from '../helpers/db-helper.js';

const API = 'http://localhost:4000/api';
const NOT_MATCHED = 'Appointment not found or phone number does not match';

const pad = (n) => String(n).padStart(2, '0');
const hm = (total) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

function recordApiTraffic(page) {
  const calls = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      calls.push({ url: req.url(), method: req.method(), headers: req.headers() });
    }
  });
  return calls;
}

function expectPhoneNeverInUrls(calls, digits) {
  for (const call of calls) {
    expect(decodeURIComponent(call.url), `phone leaked into ${call.method} ${call.url}`).not.toContain(digits);
  }
}

function detailLookups(calls) {
  return calls.filter(
    (call) => call.method === 'GET' && /\/api\/appointments\/YC-\d{4}(\?|$)/.test(call.url),
  );
}

async function expectPhoneNotInStorage(page, digits) {
  const stored = await page.evaluate(() =>
    JSON.stringify({ ...window.localStorage, ...window.sessionStorage }),
  );
  expect(stored).not.toContain(digits);
}

const created = { references: [], patientIndexes: [], slotIds: [], counters: [] };

async function waitingFixture(referenceCode, time, queueToken) {
  const fixture = await createAppointmentFixture({
    referenceCode,
    date: accraDateFromToday(0),
    time,
    status: 'WAITING',
  });
  const db = await getDb();
  await db.collection('appointments').updateOne(
    { _id: fixture._id },
    { $set: { queueToken, queueDate: fixture.date } },
  );
  return { ...fixture, queueToken };
}

test.describe('appointment lookup privacy (patient pages)', () => {
  test.skip(Boolean(dbSkipReason), dbSkipReason ?? '');
  test.skip(({ browserName }) => browserName !== 'chromium', 'server-side rules: run once, in chromium');

  test.afterEach(async () => {
    const db = await getDb();
    for (const referenceCode of created.references) {
      await db.collection('appointments').deleteOne({ referenceCode });
    }
    for (const studentIndex of created.patientIndexes) {
      await db.collection('patients').deleteOne({ studentIndex });
    }
    if (created.slotIds.length > 0) {
      await db.collection('time_slots').deleteMany({ _id: { $in: created.slotIds }, [FIXTURE_TAG]: true });
    }
    for (const { roomId, queueDate, snapshot } of created.counters) {
      if (snapshot) {
        await db.collection('queue_counters').replaceOne({ _id: snapshot._id }, snapshot);
      } else {
        await db.collection('queue_counters').deleteOne({ roomId, queueDate });
      }
    }
    created.references = [];
    created.patientIndexes = [];
    created.slotIds = [];
    created.counters = [];
    await cleanupCreatedFixtures();
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test('patient books, opens the booking without retyping the phone, arrives, and sees their queue position', async ({ page, request }, testInfo) => {
    const { hour, minute } = accraParts(new Date());
    const now = hour * 60 + minute;
    test.skip(now < 10 || now > 23 * 60 + 30, 'needs a same-day slot 20 minutes ahead; skipped near Accra midnight');

    const db = await getDb();
    const [clinician, room] = await Promise.all([
      db.collection('clinicians').findOne({ name: 'Dr. Kwame Boateng', clinicSite: 'knust-hospital' }),
      db.collection('rooms').findOne({ name: 'OPD Room 1', clinicSite: 'knust-hospital' }),
    ]);
    const today = accraDateFromToday(0);
    let start = now + 20;
    while (start % 30 === 0 || (await db.collection('time_slots').findOne({ clinicianId: clinician._id, date: today, startTime: hm(start) }))) {
      start += 1;
    }
    const time = hm(start);
    const slotId = new ObjectId();
    const stamp = new Date();
    await db.collection('time_slots').insertOne({
      _id: slotId,
      clinicianId: clinician._id,
      roomId: room._id,
      clinicSite: 'knust-hospital',
      date: today,
      startTime: time,
      endTime: hm(Math.min(start + 20, 23 * 60 + 59)),
      durationMinutes: 20,
      isBooked: false,
      appointmentId: null,
      [FIXTURE_TAG]: true,
      createdAt: stamp,
      updatedAt: stamp,
    });
    created.slotIds.push(slotId);
    created.counters.push({
      roomId: room._id,
      queueDate: today,
      snapshot: await db.collection('queue_counters').findOne({ roomId: room._id, queueDate: today }),
    });

    const tail = `${testInfo.repeatEachIndex % 10}${String(Date.now() % 1000).padStart(3, '0')}`;
    const studentIndex = `2098${tail}`;
    const subscriber = `2098${tail}7`;
    created.patientIndexes.push(studentIndex);

    const calls = recordApiTraffic(page);
    await page.goto('/appointments');
    await page.getByRole('button', { name: /Book an available appointment/i }).click();
    const afterHours = page.getByRole('button', { name: /Book at KNUST Hospital/i });
    if (await afterHours.isVisible().catch(() => false)) await afterHours.click();
    await page.getByLabel('Name').fill('Privacy Journey Patient');
    await page.getByLabel('Student Index Number').fill(studentIndex);
    await page.getByLabel('Phone Number').fill(subscriber);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('heading', { name: 'Choose Your Clinic' }).waitFor();
    await page.getByRole('button', { name: /KNUST Hospital/ }).first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: /General OPD/i }).first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: /Dr\. Kwame Boateng/ }).first().click();
    const clinicianContinue = page.getByRole('button', { name: 'Continue' });
    if (await clinicianContinue.isVisible().catch(() => false)) await clinicianContinue.click();
    await page.getByRole('button', { name: time, exact: true }).click();
    await page.getByRole('button', { name: 'Review Booking' }).click();
    await page.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page.getByText('Booking Confirmed').first()).toBeVisible();
    const reference = ((await page.locator('body').innerText()).match(/YC-\d{4}/) || [''])[0];
    expect(reference).toMatch(/^YC-\d{4}$/);
    created.references.push(reference);

    await page.getByRole('button', { name: 'View appointment' }).click();
    await expect(page.getByLabel(/Booking Phone Number/i)).toHaveCount(0);
    await expect(page.getByText(reference).first()).toBeVisible();
    await page.getByRole('button', { name: "I've arrived" }).click();
    await page.waitForURL(new RegExp(`/queue\\?ref=${reference}`));
    await expect(page.getByText(/Arrived · awaiting reception/i)).toBeVisible();

    const booked = await db.collection('appointments').findOne({ referenceCode: reference });
    const token = await staffToken(request, RECEPTIONIST);
    const queued = await request.patch(`${API}/appointments/${booked._id}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'WAITING' },
    });
    expect(queued.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByText(/You are 1st in line/)).toBeVisible();
    await expect(page.getByText(/^H-\d{2}$/).first()).toBeVisible();
    await expect(page.getByText('Privacy Journey Patient')).toHaveCount(0);

    expectPhoneNeverInUrls(calls, subscriber.slice(-9));
    const lookups = detailLookups(calls);
    expect(lookups.length).toBeGreaterThan(0);
    for (const lookup of lookups) {
      expect(lookup.headers['x-booking-phone'], `${lookup.url} sent without the booking phone`).toBeTruthy();
    }
    await expectPhoneNotInStorage(page, subscriber.slice(-9));
  });

  test('find with reference and phone opens the booking; a wrong phone gets the same message as an unknown reference', async ({ page }) => {
    await createAppointmentFixture({ referenceCode: 'YC-9521', date: accraDateFromToday(1), time: '10:13' });
    const phone = await patientPhone();
    const calls = recordApiTraffic(page);

    await page.goto('/appointments?find=1');
    await page.getByLabel(/Appointment Reference Code/i).fill('YC-9521');
    await page.getByLabel(/Booking Phone Number/i).fill('0209111222');
    await page.getByRole('button', { name: /Find Appointment/i }).click();
    await expect(page.getByText(NOT_MATCHED)).toBeVisible();

    await page.getByLabel(/Appointment Reference Code/i).fill('YC-0001');
    await page.getByLabel(/Booking Phone Number/i).fill(phone);
    await page.getByRole('button', { name: /Find Appointment/i }).click();
    await expect(page.getByText(NOT_MATCHED)).toBeVisible();

    await page.getByLabel(/Appointment Reference Code/i).fill('YC-9521');
    await page.getByRole('button', { name: /Find Appointment/i }).click();
    await expect(page.getByText('YC-9521').first()).toBeVisible();
    await expect(page.getByText(/Not arrived at clinic yet/i)).toBeVisible();

    expectPhoneNeverInUrls(calls, phone.slice(-9));
    for (const lookup of detailLookups(calls)) {
      expect(lookup.headers['x-booking-phone'], `${lookup.url} sent without the booking phone`).toBeTruthy();
    }
    await expectPhoneNotInStorage(page, phone.slice(-9));
  });

  test('queue page search asks for reference and phone together', async ({ page }) => {
    const fixture = await waitingFixture('YC-9522', '00:07', 'B-92');
    const phone = await patientPhone();
    const calls = recordApiTraffic(page);

    await page.goto('/queue');
    await page.getByLabel('Appointment Reference Code').fill('YC-9522');
    await page.getByLabel('Booking Phone Number').fill('0209111222');
    await page.getByRole('button', { name: /Check queue/i }).click();
    await expect(page.getByText(NOT_MATCHED)).toBeVisible();

    await page.getByLabel('Booking Phone Number').fill(phone);
    await page.getByRole('button', { name: /Check queue/i }).click();
    await expect(page.getByText('Your queue token')).toBeVisible();
    await expect(page.getByText(fixture.queueToken, { exact: true }).first()).toBeVisible();

    expectPhoneNeverInUrls(calls, phone.slice(-9));
  });

  test('a reference-only queue link shows progress without personal details', async ({ page }) => {
    await waitingFixture('YC-9523', '00:09', 'B-93');
    const db = await getDb();
    const appointment = await db.collection('appointments').findOne({ referenceCode: 'YC-9523' });
    const patient = await db.collection('patients').findOne({ _id: appointment.patientId });
    const calls = recordApiTraffic(page);

    await page.goto('/queue?ref=YC-9523');
    await expect(page.getByText('Your queue token')).toBeVisible();
    await expect(page.getByText('B-93', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(patient.fullName)).toHaveCount(0);
    expect(detailLookups(calls)).toHaveLength(0);
  });
});
