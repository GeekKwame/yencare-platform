import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import {
  createPatientService,
  INDEX_PHONE_CONFLICT_MESSAGE,
  PATIENT_MATCH_FAILED_MESSAGE,
} from '../src/patients/service.js';

function startApp() {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
  });
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
      });
    });
  });
}

describe('patients HTTP', () => {
  /** @type {{ server: import('node:http').Server, url: string }[]} */
  const started = [];

  after(async () => {
    await Promise.all(
      started.map(
        ({ server }) =>
          new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      ),
    );
  });

  async function client() {
    const instance = await startApp();
    started.push(instance);
    return instance;
  }

  it('POST /api/patients answers a public caller 200 with only the id, whether created or found', async () => {
    const { url } = await client();
    const created = await fetch(`${url}/api/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Efua Darko',
        studentIndex: '20620111',
        phoneNumber: '024 700 1122',
        nhis: '12345678',
      }),
    });
    assert.equal(created.status, 200);
    const createdBody = await created.json();
    assert.deepEqual(Object.keys(createdBody), ['id']);
    assert.ok(createdBody.id);

    const found = await fetch(`${url}/api/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentIndex: '20620111', phoneNumber: '0247001122' }),
    });
    assert.equal(found.status, 200);
    assert.deepEqual(await found.json(), { id: createdBody.id });
  });

  it('GET /api/patients/:identifier returns 200 for index or phone', async () => {
    const { url } = await client();
    await fetch(`${url}/api/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Yaw Sarpong',
        studentIndex: '20620222',
        phoneNumber: '020 811 3344',
      }),
    });

    const byIndex = await fetch(`${url}/api/patients/20620222`);
    assert.equal(byIndex.status, 200);
    assert.equal((await byIndex.json()).studentIndex, '20620222');

    const byPhone = await fetch(`${url}/api/patients/${encodeURIComponent('0208113344')}`);
    assert.equal(byPhone.status, 200);
    const byPhoneBody = await byPhone.json();
    assert.equal(byPhoneBody.phone, '+233208113344');
    assert.equal(byPhoneBody.phoneNumber, '+233208113344');
  });

  it('GET returns 404 when the patient does not exist', async () => {
    const { url } = await client();
    const res = await fetch(`${url}/api/patients/20699999`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'Patient not found');
  });

  it('POST returns 400 for invalid student index or phone', async () => {
    const { url } = await client();
    const badIndex = await fetch(`${url}/api/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Akosua Boateng',
        studentIndex: '12',
        phoneNumber: '0241234567',
      }),
    });
    assert.equal(badIndex.status, 400);
    assert.match((await badIndex.json()).error, /student index/);

    const badPhone = await fetch(`${url}/api/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Akosua Boateng',
        studentIndex: '20612345',
        phoneNumber: '123',
      }),
    });
    assert.equal(badPhone.status, 400);
    assert.match((await badPhone.json()).error, /Ghana phone/);
  });

  it('GET /health reports service identity and database fields', async () => {
    const { url } = await client();
    const res = await fetch(`${url}/health`);
    const body = await res.json();
    assert.equal(body.service, 'yencare-api');
    assert.equal(typeof body.ok, 'boolean');
    assert.equal(typeof body.db, 'string');
    assert.equal(typeof body.latencyMs, 'number');
    assert.equal(res.status, body.ok ? 200 : 503);
  });
});

describe('patients HTTP: who may change an existing record', () => {
  const started = [];
  const TEST_SECRET = 'patients-test-staff-jwt-secret';

  after(async () => {
    await Promise.all(
      started.map(
        ({ server }) =>
          new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      ),
    );
  });

  async function client() {
    const app = createApp({
      patientService: createPatientService(createMemoryStore()),
      staffAuth: createStaffAuthService({ jwtSecret: TEST_SECRET, demoPassword: DEMO_STAFF_PASSWORD }),
    });
    const instance = await new Promise((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => {
        resolve({ server, url: `http://127.0.0.1:${server.address().port}` });
      });
    });
    started.push(instance);
    return instance.url;
  }

  async function login(url, identifier) {
    const res = await fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier, password: DEMO_STAFF_PASSWORD }),
    });
    assert.equal(res.status, 200);
    return (await res.json()).token;
  }

  function register(url, body, token) {
    return fetch(`${url}/api/patients`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  const original = { fullName: 'Efua Darko', studentIndex: '20620111', phoneNumber: '024 700 1122' };
  const takeover = { fullName: 'Someone Else', studentIndex: '20620111', phoneNumber: '027 922 5566' };

  it('refuses a new phone for a known index without a verified reception token', async () => {
    const url = await client();
    assert.equal((await register(url, original)).status, 200);

    const forged = jwt.sign({ sub: 'x', staffId: 'stf_01', role: 'RECEPTIONIST' }, 'attacker-chosen-secret');
    const doctor = await login(url, 'kwame.boateng@yencare.gh');

    for (const token of [null, doctor, forged]) {
      const res = await register(url, takeover, token);
      assert.equal(res.status, 409);
      assert.equal((await res.json()).error, PATIENT_MATCH_FAILED_MESSAGE);
    }

    const stored = await (
      await fetch(`${url}/api/patients/20620111`, {
        headers: { authorization: `Bearer ${await login(url, 'abena.osei@yencare.gh')}` },
      })
    ).json();
    assert.equal(stored.phoneNumber, '+233247001122');
    assert.equal(stored.fullName, 'Efua Darko');
  });

  it('refuses GET by index or phone without a verified reception token, and allows reception', async () => {
    const url = await client();
    assert.equal((await register(url, { ...original, nhis: '12345678' })).status, 200);

    const forged = jwt.sign({ sub: 'x', staffId: 'stf_01', role: 'RECEPTIONIST' }, 'attacker-chosen-secret');
    const doctor = await login(url, 'kwame.boateng@yencare.gh');
    const lookup = (identifier, token) =>
      fetch(`${url}/api/patients/${identifier}`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

    for (const identifier of ['20620111', '20699999', '0247001122']) {
      for (const [token, status] of [[null, 401], [forged, 401], [doctor, 403]]) {
        const res = await lookup(identifier, token);
        assert.equal(res.status, status, `${identifier} with ${token ? 'a token' : 'no token'}`);
        const body = await res.json();
        assert.equal(body.id, undefined);
        assert.equal(body.fullName, undefined);
      }
    }

    const res = await lookup('20620111', await login(url, 'abena.osei@yencare.gh'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.fullName, 'Efua Darko');
    assert.equal(body.nhisNumber, '12345678');
  });

  it('gives a public caller the generic message and no data for an index alone or a wrong phone, known or not', async () => {
    const url = await client();
    assert.equal((await register(url, original)).status, 200);

    const probes = [
      { studentIndex: '20620111' },
      { studentIndex: '20699999' },
      { fullName: 'Someone Else', studentIndex: '20620111' },
      takeover,
    ];
    for (const probe of probes) {
      const res = await register(url, probe);
      assert.equal(res.status, 409, JSON.stringify(probe));
      const body = await res.json();
      assert.equal(body.error, PATIENT_MATCH_FAILED_MESSAGE);
      assert.deepEqual(
        Object.keys(body).filter((key) => key !== 'requestId'),
        ['error'],
      );
    }
  });

  it('answers a public caller 200 with only the id for a new or matching record, and reception 201/200 with the full record', async () => {
    const url = await client();
    const reception = await login(url, 'abena.osei@yencare.gh');
    const forged = jwt.sign({ sub: 'x', staffId: 'stf_01', role: 'RECEPTIONIST' }, 'attacker-chosen-secret');

    const createdRes = await register(url, { ...original, nhis: '12345678' });
    assert.equal(createdRes.status, 200);
    const createdBody = await createdRes.json();
    assert.deepEqual(Object.keys(createdBody), ['id']);

    for (const token of [null, forged]) {
      const foundRes = await register(url, original, token);
      assert.equal(foundRes.status, 200);
      assert.deepEqual(await foundRes.json(), { id: createdBody.id });
    }

    const deskFound = await register(url, original, reception);
    assert.equal(deskFound.status, 200);
    const deskBody = await deskFound.json();
    assert.equal(deskBody.id, createdBody.id);
    assert.equal(deskBody.fullName, 'Efua Darko');
    assert.equal(deskBody.studentIndex, '20620111');
    assert.equal(deskBody.phoneNumber, '+233247001122');
    assert.equal(deskBody.nhisNumber, '12345678');

    const deskCreated = await register(
      url,
      { fullName: 'Yaw Sarpong', studentIndex: '20620222', phoneNumber: '020 811 3344' },
      reception,
    );
    assert.equal(deskCreated.status, 201);
    assert.equal((await deskCreated.json()).fullName, 'Yaw Sarpong');
  });

  it('gives a public caller the same message for a phone mismatch and a crossed index/phone, and reception the specific one', async () => {
    const url = await client();
    assert.equal((await register(url, original)).status, 200);
    assert.equal(
      (await register(url, { fullName: 'Yaw Sarpong', studentIndex: '20620222', phoneNumber: '020 811 3344' })).status,
      200,
    );
    const crossed = { fullName: 'Abena Kusi', studentIndex: '20620111', phoneNumber: '020 811 3344' };

    const mismatch = await register(url, takeover);
    const conflict = await register(url, crossed);
    assert.equal(mismatch.status, 409);
    assert.equal(conflict.status, 409);
    assert.equal((await mismatch.json()).error, PATIENT_MATCH_FAILED_MESSAGE);
    assert.equal((await conflict.json()).error, PATIENT_MATCH_FAILED_MESSAGE);

    const atDesk = await register(url, crossed, await login(url, 'abena.osei@yencare.gh'));
    assert.equal(atDesk.status, 409);
    assert.equal((await atDesk.json()).error, INDEX_PHONE_CONFLICT_MESSAGE);
  });

  it('lets a verified receptionist update the phone', async () => {
    const url = await client();
    assert.equal((await register(url, original)).status, 200);

    const res = await register(url, takeover, await login(url, 'abena.osei@yencare.gh'));

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.phoneNumber, '+233279225566');
    assert.equal(body.fullName, 'Someone Else');
  });
});
