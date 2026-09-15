import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

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

  it('POST /api/patients creates then returns 200 on lookup-or-register', async () => {
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
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.fullName, 'Efua Darko');
    assert.equal(createdBody.studentIndex, '20620111');
    assert.equal(createdBody.phone, '+233247001122');
    assert.equal(createdBody.phoneNumber, '+233247001122');
    assert.equal(createdBody.nhisNumber, '12345678');
    assert.equal(createdBody.nhis, '12345678');

    const found = await fetch(`${url}/api/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentIndex: '20620111' }),
    });
    assert.equal(found.status, 200);
    const foundBody = await found.json();
    assert.equal(foundBody.id, createdBody.id);
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

  it('GET /health is ok', async () => {
    const { url } = await client();
    const res = await fetch(`${url}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  });
});
