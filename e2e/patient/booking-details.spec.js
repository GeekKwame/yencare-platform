import { expect, test } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { closeDb, dbSkipReason, FIXTURE_TAG, getDb } from '../helpers/db-helper.js';

const API = 'http://localhost:4000/api';
const GENERIC = "We couldn't confirm these details. Please check them, or see reception for help.";
const DRAFT_KEY = 'yencare.booking.draft';

const created = { patientIds: [], registered: [] };

function uniqueIdentity(testInfo, slot) {
  const seed = (Date.now() + testInfo.repeatEachIndex * 7 + slot * 3) % 10000;
  const tail = String(seed).padStart(4, '0');
  return {
    studentIndex: `2099${tail}`,
    subscriber: `2099${slot}${tail}`,
  };
}

async function insertStudent({ studentIndex, subscriber }) {
  const db = await getDb();
  const now = new Date();
  const _id = new ObjectId();
  await db.collection('patients').insertOne({
    _id,
    fullName: `Booking Details ${studentIndex}`,
    studentIndex,
    phone: `+233${subscriber}`,
    [FIXTURE_TAG]: true,
    createdAt: now,
    updatedAt: now,
  });
  created.patientIds.push(_id);
  return _id;
}

async function openDetailsStep(page) {
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem('e2e-draft-seeded')) {
      sessionStorage.setItem('e2e-draft-seeded', '1');
      sessionStorage.setItem(key, JSON.stringify({ step: 2, formData: {} }));
    }
  }, DRAFT_KEY);
  await page.goto('/appointments');
  await expect(page.getByRole('heading', { name: 'Your Details' })).toBeVisible();
}

async function submitDetails(page, { studentIndex, subscriber }) {
  await page.getByLabel('Name').fill(`Booking Details ${studentIndex}`);
  await page.getByLabel('Student Index Number').fill(studentIndex);
  await page.getByLabel('Phone Number').fill(subscriber);
  const response = page.waitForResponse(
    (res) => res.url().endsWith('/api/patients') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Continue' }).click();
  const res = await response;
  return { status: res.status(), json: await res.json() };
}

async function readDraft(page) {
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), DRAFT_KEY);
}

test.describe('booking form: your details (public)', () => {
  test.skip(Boolean(dbSkipReason), dbSkipReason ?? '');
  test.skip(({ browserName }) => browserName !== 'chromium', 'server-side rules: run once, in chromium');

  test.afterEach(async () => {
    const db = await getDb();
    if (created.patientIds.length > 0) {
      await db.collection('patients').deleteMany({ _id: { $in: created.patientIds }, [FIXTURE_TAG]: true });
    }
    for (const { studentIndex, phone } of created.registered) {
      await db.collection('patients').deleteOne({ studentIndex, phone });
    }
    created.patientIds = [];
    created.registered = [];
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test('a known student with a wrong phone gets the generic message and no data', async ({ page, request }, testInfo) => {
    const student = uniqueIdentity(testInfo, 1);
    await insertStudent(student);

    const lookup = await request.get(`${API}/patients/${student.studentIndex}`);
    expect(lookup.status()).toBe(401);
    expect((await lookup.json()).fullName).toBeUndefined();

    await openDetailsStep(page);
    const wrongLast = student.subscriber.endsWith('0') ? '1' : '0';
    const res = await submitDetails(page, {
      ...student,
      subscriber: `${student.subscriber.slice(0, -1)}${wrongLast}`,
    });

    expect(res.status).toBe(409);
    expect(res.json.error).toBe(GENERIC);
    expect(Object.keys(res.json).filter((key) => key !== 'requestId')).toEqual(['error']);
    await expect(page.getByText(GENERIC)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your Details' })).toBeVisible();
    expect((await readDraft(page)).formData.patientId || '').toBe('');
  });

  test('a known student with the matching phone continues, and the typed phone is kept', async ({ page }, testInfo) => {
    const student = uniqueIdentity(testInfo, 2);
    const patientId = await insertStudent(student);

    await openDetailsStep(page);
    const res = await submitDetails(page, student);

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ id: String(patientId) });
    await expect(page.getByRole('heading', { name: 'Your Details' })).toBeHidden();
    const { formData } = await readDraft(page);
    expect(formData.patientId).toBe(String(patientId));
    expect(formData.phoneNumber).toBe(`0${student.subscriber}`);
  });

  test('a new student is registered with the same 200 { id } response', async ({ page }, testInfo) => {
    const student = uniqueIdentity(testInfo, 3);
    created.registered.push({ studentIndex: student.studentIndex, phone: `+233${student.subscriber}` });

    await openDetailsStep(page);
    const res = await submitDetails(page, student);

    expect(res.status).toBe(200);
    expect(Object.keys(res.json)).toEqual(['id']);
    const db = await getDb();
    const stored = await db.collection('patients').findOne({ studentIndex: student.studentIndex });
    expect(String(stored?._id)).toBe(res.json.id);
    expect(stored.phone).toBe(`+233${student.subscriber}`);
    await expect(page.getByRole('heading', { name: 'Your Details' })).toBeHidden();
    expect((await readDraft(page)).formData.phoneNumber).toBe(`0${student.subscriber}`);
  });
});
