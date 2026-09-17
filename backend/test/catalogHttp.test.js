import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

const SAMPLE_ROOM = {
  id: 'room-1',
  name: 'Room 1',
  clinicSite: 'students-clinic',
};
const SAMPLE_CLINICIAN = {
  id: 'clin-1',
  name: 'Dr. Kwame Boateng',
  roomId: SAMPLE_ROOM,
};
const SAMPLE_SLOT = {
  id: 'slot-1',
  clinicianId: SAMPLE_CLINICIAN,
  roomId: SAMPLE_ROOM,
  date: '2026-09-15',
  startTime: '11:00',
};

function startApp() {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    catalog: {
      listRooms: async () => [SAMPLE_ROOM],
      listClinicians: async () => [SAMPLE_CLINICIAN],
      listTimeSlots: async () => [SAMPLE_SLOT],
    },
  });
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('clinic catalog HTTP', () => {
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

  it('GET /api/rooms and /api/clinicians return ids for Postman booking bodies', async () => {
    const { url } = await client();
    const rooms = await (await fetch(`${url}/api/rooms`)).json();
    const clinicians = await (await fetch(`${url}/api/clinicians`)).json();
    const slots = await (await fetch(`${url}/api/time-slots`)).json();

    assert.equal(rooms[0].id, 'room-1');
    assert.equal(clinicians[0].id, 'clin-1');
    assert.equal(slots[0].id, 'slot-1');
  });

  it('GET /api/time-slots forwards clinicianId and availability filters', async () => {
    let received = null;
    const app = createApp({
      patientService: createPatientService(createMemoryStore()),
      catalog: {
        listRooms: async () => [],
        listClinicians: async () => [],
        listTimeSlots: async (filters) => {
          received = filters;
          return [];
        },
      },
    });

    const instance = await new Promise((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        resolve({ server, url: `http://127.0.0.1:${port}` });
      });
    });
    started.push(instance);

    await fetch(
      `${instance.url}/api/time-slots?clinicianId=clin-1&available=true&date=2026-09-17`,
    );

    assert.equal(received.clinicianId, 'clin-1');
    assert.equal(received.available, 'true');
    assert.equal(received.date, '2026-09-17');
  });

  it('GET /api/time-slots forwards fromDate filter', async () => {
    let received = null;
    const app = createApp({
      patientService: createPatientService(createMemoryStore()),
      catalog: {
        listRooms: async () => [],
        listClinicians: async () => [],
        listTimeSlots: async (filters) => {
          received = filters;
          return [];
        },
      },
    });

    const instance = await new Promise((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        resolve({ server, url: `http://127.0.0.1:${port}` });
      });
    });
    started.push(instance);

    await fetch(`${instance.url}/api/time-slots?fromDate=2026-09-17`);

    assert.equal(received.fromDate, '2026-09-17');
  });
});

