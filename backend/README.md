# YɛnCare backend

Express API + MongoDB for Gate 2, plus the SMS wrapper. Patient registration follows the interactive prototype: **P02 Your Details** (register) and **P09 Find** (lookup by student index or Ghana phone). It writes to the Mongoose `Patient` collection (`phone`, `studentIndex`, `nhisNumber`).

Schema, indexes, and booking write path: [`docs/DATABASE_ARCHITECTURE.md`](./docs/DATABASE_ARCHITECTURE.md).

---

## Patient registration & verification

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/health` | Liveness. **200** `{ "ok": true, "service": "yencare-api" }` |
| `POST` | `/api/patients` | Find-or-create by student index and/or Ghana phone |
| `GET` | `/api/patients/:identifier` | Lookup by student index or Ghana phone |
| `GET` | `/api/appointments` | List appointments (`date=YYYY-MM-DD`, `clinicSite` or `clinic`) |
| `POST` | `/api/appointments` | Book appointment & automatically dispatch SMS |
| `GET` | `/api/appointments/:reference` | Lookup booking by `referenceCode` (e.g. `YC-4821`) |
| `PATCH` | `/api/appointments/:id/status` | Transition status (e.g. `BOOKED` → `CHECKED_IN`) |
| `GET` | `/api/rooms` | Seeded rooms (`id` → `roomId`) |
| `GET` | `/api/clinicians` | Seeded clinicians (`id` → `clinicianId`) |
| `GET` | `/api/time-slots` | Seeded slots (`id` → `timeSlotId`; filter `date`, `clinicSite`, `available`) |

No auth on these routes. Identifier is an 8-digit KNUST index (`20612345`) or a Ghana number (`0247001122`, `024 700 1122`, `+233247001122`). Encode `+` in URLs as `%2B`.

### Status codes

| Status | When |
|---|---|
| **200** | `POST` found an existing patient, or `GET` lookup succeeded |
| **201** | `POST` inserted a new patient |
| **400** | Invalid JSON, invalid student index, or invalid Ghana phone |
| **404** | `GET` — no patient for that identifier |
| **409** | `POST` — the student index and phone belong to two different patients |
| **500** | Unexpected server error |

### Field mapping

JSON (frontend / Postman) uses camelCase. MongoDB uses the Mongoose names.

| JSON (request aliases) | MongoDB / populate / SMS | Rules |
|---|---|---|
| `fullName`, `full_name`, `patientName` | `fullName` | Required **to create**. 2–120 characters |
| `studentIndex`, `student_index` | `studentIndex` | Optional for walk-ins. If present: **exactly 8 digits** |
| `phone`, `phoneNumber`, `phone_number` | **`phone`** | Required **to create**. Ghana mobile; stored as E.164 (`+233…`) |
| `nhisNumber`, `nhis`, `nhis_number` | **`nhisNumber`** | Optional |

Responses include **both** `phone` and `phoneNumber` (same E.164 value) so Able’s `.populate('patientId', 'fullName phone studentIndex')` and the web client never read `undefined` for SMS.

`POST` needs at least one of student index or phone so it can look someone up. Creating a **new** row also needs `fullName` and a valid phone (P02 + `Patient` schema).

### Response body

```json
{
  "id": "68bf2c0e9c1a2b0012345678",
  "fullName": "Efua Darko",
  "studentIndex": "20620111",
  "phone": "+233247001122",
  "phoneNumber": "+233247001122",
  "nhisNumber": "12345678",
  "nhis": "12345678",
  "createdAt": "2026-09-08T14:00:00.000Z",
  "updatedAt": "2026-09-08T14:00:00.000Z"
}
```

Error body: `{ "error": "Patient not found" }`.

### Run locally (Frontend & Backend Setup Guide)

The frontend app expects the backend API to be running on `http://localhost:4000` with routes under `/api`. Follow these steps to get the backend and database running locally:

#### 1. Configure backend environment
```bash
cd backend
# On Windows (cmd/PowerShell):
copy .env.example .env
# On macOS / Linux:
cp .env.example .env
```

In `backend/.env`, choose how MongoDB will run:
- **Local Docker (recommended for offline dev)**:
  ```env
  MONGODB_URI=mongodb://127.0.0.1:27017/yencare
  SMS_PROVIDER=mock
  PORT=4000
  ```
- **MongoDB Atlas (cloud)**: paste your Atlas connection string as `MONGODB_URI`.

> [!NOTE]
> Setting `SMS_PROVIDER=mock` allows appointments to be booked without sending real SMS or requiring live mNotify credentials.

#### 2. Start local MongoDB with Docker Compose
`docker-compose.yml` is located inside the `backend/` directory.

**If you are in the `backend/` directory:**
```bash
docker compose up -d
```

**If you are in the project root directory:**
```bash
docker compose -f backend/docker-compose.yml up -d
```

> [!WARNING]
> Running `docker compose up` from the root directory without `-f backend/docker-compose.yml` will fail with:
> `no configuration file provided: not found`.

To check that MongoDB is healthy and running:
```bash
docker compose ps
```
*(To stop MongoDB later: `docker compose down` inside `backend/`)*

#### 3. Install dependencies, migrate, and seed data
Seeding is **essential** for the frontend booking flow so rooms, clinicians, and time slots exist in the database:
```bash
# Inside backend/
npm install
npm run db:migrate
npm run db:seed
```
*(Or from the repository root: `npm run db:migrate && npm run db:seed`)*

#### 4. Start the backend API server
```bash
# Inside backend/
npm run dev

# OR from repository root:
npm run dev:api
```

Verify the server is running by visiting:
- [http://localhost:4000/health](http://localhost:4000/health) → returns `{ "ok": true, "service": "yencare-api" }`

#### 5. Configure the Frontend
In `frontend/`:
1. Ensure `frontend/.env` exists (copy from `frontend/.env.example`):
   ```env
   VITE_API_BASE_URL=http://localhost:4000/api
   ```
2. Start the frontend dev server:
   ```bash
   cd frontend
   npm run dev
   # OR from repository root:
   npm run dev:frontend
   ```

Now the frontend booking form can register patients and book appointments without getting `"Unable to connect to the server"`.

### Render staging deployment

This repository includes a Render blueprint at `../render.yaml` that deploys this API from `backend/`.

Configure these required environment variables in the Render dashboard for the staging service:
- `MONGODB_URI` (staging Atlas URI)
- `MNOTIFY_API_KEY` (mNotify API v2 key)
- `MNOTIFY_SENDER_ID` (approved sender ID, max 11 chars)

Recommended defaults for staging:
- `NODE_ENV=production`
- `SMS_PROVIDER=mnotify`
- `PORT=4000`

Verification checklist:
1. Trigger a Render deploy from your staging branch.
2. Open `https://<your-render-service>.onrender.com/health`.
3. Confirm HTTP `200` and body `{ "ok": true, "service": "yencare-api" }`.
4. Confirm secrets are only set in Render dashboard and not committed to Git.

### Postman

1. Start the API (`npm run dev` in `backend`). Confirm `GET http://localhost:4000/health` returns **200**.
2. No auth. For POST, set header `Content-Type: application/json`.

**Register (create)** — `POST http://localhost:4000/api/patients`

```json
{
  "fullName": "Efua Darko",
  "studentIndex": "20620111",
  "phoneNumber": "024 700 1122",
  "nhis": "12345678"
}
```

First send → **201**. Same body again → **200** and the same `id`.

| Request | Expect |
|---|---|
| `GET http://localhost:4000/api/patients/20620111` | **200** by student index |
| `GET http://localhost:4000/api/patients/0247001122` | **200** by local phone |
| `GET http://localhost:4000/api/patients/%2B233247001122` | **200** (`+` encoded as `%2B`) |
| `GET http://localhost:4000/api/patients/20699999` | **404** |
| POST `"studentIndex": "12"` | **400** (must be 8 digits) |
| POST `"phoneNumber": "123"` | **400** |

Walk-in (no index): `{ "fullName": "Kwame Ofori Atta", "phoneNumber": "024 555 1234" }`.

**Clinic IDs for booking (Postman)** — after `npm run db:seed`:

| Request | Use |
|---|---|
| `GET http://localhost:4000/api/rooms` | Copy `id` → `roomId` |
| `GET http://localhost:4000/api/clinicians` | Copy `id` → `clinicianId` (`roomId` is populated) |
| `GET http://localhost:4000/api/time-slots?date=2026-09-15&available=true` | Copy `id` → `timeSlotId` |

### Appointment Booking (`POST /api/appointments`)

Create an appointment and automatically dispatch an SMS confirmation to the patient's phone number.

**Request Body (`POST /api/appointments`)**:

```json
{
  "patientId": "68bf2c0e9c1a2b0012345678",
  "clinicianId": "68bf2c0e9c1a2b0012345671",
  "roomId": "68bf2c0e9c1a2b0012345672",
  "clinicSite": "students-clinic",
  "visitType": "general-opd",
  "appointmentDate": "2026-09-15",
  "appointmentTime": "10:00",
  "timeSlotId": "68bf2c0e9c1a2b0012345673"
}
```

| Field | Required | Description |
|---|---|---|
| `patientId` | Yes | MongoDB ObjectId of the patient (`POST /api/patients`) |
| `clinicianId` | Yes | MongoDB ObjectId of the clinician (`GET /api/clinicians`) |
| `roomId` | Yes | MongoDB ObjectId of the consultation room (`GET /api/rooms`) |
| `clinicSite` | Yes | `students-clinic` or `social-science-gf7` |
| `visitType` | Yes | `general-opd`, `follow-up`, `dressing`, or `other` |
| `appointmentDate` | Yes | Date string formatted as `YYYY-MM-DD` |
| `appointmentTime` | Yes | 24-hour time string formatted as `HH:mm` (e.g. `10:00`) |
| `timeSlotId` | Optional | ObjectId of the booked time slot (`GET /api/time-slots`) |

**Response Body (`201 Created`)**:

```json
{
  "id": "68bf2c0e9c1a2b0012345680",
  "referenceCode": "YC-4821",
  "status": "BOOKED",
  "patientId": "68bf2c0e9c1a2b0012345678",
  "clinicianId": "68bf2c0e9c1a2b0012345671",
  "roomId": "68bf2c0e9c1a2b0012345672",
  "clinicSite": "students-clinic",
  "visitType": "general-opd",
  "appointmentDate": "2026-09-15",
  "appointmentTime": "10:00",
  "timeSlotId": "68bf2c0e9c1a2b0012345673",
  "createdAt": "2026-09-09T08:00:00.000Z",
  "sms": {
    "ok": true
  }
}
```

**Lookup Booking (`GET /api/appointments/:reference`)**:

Retrieve an existing booking by its speakable reference code (e.g., `YC-4821`) or MongoDB ObjectId:

```bash
curl -s http://localhost:4000/api/appointments/YC-4821
```

Returns **200** with populated `patientId`, `clinicianId`, `roomId`, and `timeSlotId`, or **404** if not found.

### curl

```bash
curl -s -X POST http://localhost:4000/api/patients -H "content-type: application/json" -d "{\"fullName\":\"Efua Darko\",\"studentIndex\":\"20620111\",\"phoneNumber\":\"024 700 1122\"}"
curl -s http://localhost:4000/api/patients/20620111
```

---

## SMS (`sendSms`)

Reusable wrapper for Gate 2 confirmation texts. **Able** (appointments API) and **Emmanuella** (patient registration / trigger SMS on book) should import `sendSms()` and not call mNotify or Africa's Talking themselves.

This is the only SMS surface the backend should use.

| | |
|---|---|
| Live provider | **mNotify** — real Ghana handsets |
| Offline | `SMS_PROVIDER=mock` |
| Optional | Africa's Talking sandbox |
| Module type | ESM (`"type": "module"`). Use `import`, not `require` |

The React prototype `SmsModal` is a **UI fake log**. It is not this module.

---

## Import

From another file inside `backend/src/` (for example a booking route):

```js
import { sendSms } from './sms/sendSms.js';

const result = await sendSms(patient.phone, [
  'YenCare Health',
  '',
  'Appointment Confirmed',
  'Tue 15 Sep, 9:30 AM',
  'Booking ID: YC-4821',
  'Arrive by 9:15 AM',
].join('\n'));

if (!result.ok) {
  console.error('SMS not delivered', result.error);
}
```

Package root:

```js
import { sendSms, normalizeGhanaPhone } from 'yencare-backend';
```

Load environment variables in the Express entry file **before** calling `sendSms`.

---

## Contract

```ts
sendSms(to: string, message: string) => Promise<SmsResult>
```

| Argument | Required | Accepted forms |
|---|---|---|
| `to` | Yes | `024 123 4567`, `0241234567`, `241234567`, `233241234567`, `+233241234567` |
| `message` | Yes | Non-empty string. Keep confirmation SMS short (≤160 chars). |

`to` is stored/returned as E.164 (`+233…`). mNotify is sent the local form (`024…`). Empty `to` or `message` **throws**. Provider failures return `{ ok: false }` so booking can still succeed.

---

## Modes

| `SMS_PROVIDER` | Keys | What happens | Where you see it |
|---|---|---|---|
| `mock` | None | Logs to the terminal | Terminal |
| `mnotify` | `MNOTIFY_API_KEY` | POST to mNotify Quick SMS | Real phone + mNotify reports |
| `mnotify` | Missing key | Warns and falls back to mock | Terminal |
| `africastalking` | `AT_API_KEY` | AT sandbox | Simulator / AT dashboard |

---

## mNotify (live Ghana SMS)

1. Sign up at [mnotify.com](https://www.mnotify.com/). New accounts often get about **50 free SMS**.
2. Dashboard → account menu → **API v2** → **Create API Key**.
3. Register sender ID **`YenCare`** (max 11 characters). Sending can fail until it is approved.
4. Put the key in `backend/.env` (never commit this file):

```env
SMS_PROVIDER=mnotify
MNOTIFY_API_KEY=paste-the-key-here
MNOTIFY_SENDER_ID=YenCare
```

5. Send to a real number:

```bash
npm run sms:test -- +233536064409
```

6. Check that handset. Delivery reports: mNotify dashboard.

Each extra test after the free units costs a few pesewas. Use `SMS_PROVIDER=mock` for offline work.

Docs: [readthedocs.mnotify.com](https://readthedocs.mnotify.com/)

---

## Local mock (offline)

```bash
cd backend
copy .env.example .env
```

Set `SMS_PROVIDER=mock`, then `npm test` and `npm run sms:test`.

---

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | Express listen port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/yencare` | MongoDB connection string (required to start the API) |
| `SMS_PROVIDER` | `mock` | `mock`, `mnotify`, or `africastalking` |
| `MNOTIFY_API_KEY` | empty | mNotify API v2 key |
| `MNOTIFY_SENDER_ID` | `YenCare` | Max 11 chars; must be registered |
| `MNOTIFY_API_URL` | `https://api.mnotify.com/api/sms/quick` | mNotify Quick SMS endpoint |
| `AT_USERNAME` | `sandbox` | Only if using Africa's Talking |
| `AT_API_KEY` | empty | AT sandbox key |
| `AT_SENDER_ID` | empty | Optional Africa's Talking sender ID |

Share keys with Able and Emmanuella privately. Do not put them in git. `backend/.env` is gitignored. Complete configuration details: [`../docs/development/environment-variables.md`](../docs/development/environment-variables.md).


---

## Hooking this into booking (Able / Emmanuella)

1. Upsert the patient with `POST /api/patients` (or the `Patient` model).
2. Save the appointment.
3. Call `await sendSms(phone, confirmationBody)`.
4. If `result.ok === false`, log `result.error` and still return HTTP 201 with `YC-4821`.
5. Web confirmation is the source of truth — do not block on SMS.

---

## Troubleshooting

| Symptom | What to check |
|---|---|
| Frontend: `"Unable to connect to the server"` | Backend server is not running on port 4000. Run `npm run dev` in `backend/` and verify `frontend/.env` has `VITE_API_BASE_URL=http://localhost:4000/api`. |
| Docker: `no configuration file provided: not found` | You are running `docker compose` from the project root instead of `backend/`. Run `cd backend && docker compose up -d` or `docker compose -f backend/docker-compose.yml up -d`. |
| Frontend: Empty rooms, clinicians, or slots | The database has not been seeded. Run `npm run db:migrate && npm run db:seed` in `backend/`. |
| API will not start / `[db] connection error` | `MONGODB_URI` in `backend/.env`. Atlas SRV needs network DNS; local: `docker compose up -d` |
| Falls back to mock | `MNOTIFY_API_KEY` is empty |
| mNotify 401 / invalid key | Generate the key under **API v2**, not an old v1 key |
| Sender ID rejected | Register `YenCare` in the dashboard and wait for approval |
| No text on the phone | Number must be a real Ghana mobile; check mNotify delivery report |
| `Invalid Ghana phone` | Use `024…` or `+233…`, not `024 XXX XXXX` |
| GET with `+233…` returns 404 | Encode plus as `%2B` (`/api/patients/%2B233247001122`) |

---

## Layout

```
backend/
├── README.md
├── .env.example
├── docker-compose.yml          # optional local MongoDB
├── docs/DATABASE_ARCHITECTURE.md
├── scripts/migrate.js
├── scripts/seed.js
├── scripts/send-test-sms.js
├── src/server.js               # Express entry (connect Mongo + listen)
├── src/http/                   # app, /api/patients, /api/rooms, /api/clinicians, /api/time-slots
├── src/db/                     # mongoose connection + collection specs
├── src/models/                 # Patient, Appointment, Clinician, Room, TimeSlot
├── src/patients/               # validate + find-or-create + phone/NHIS field aliases
├── src/sms/sendSms.js
├── src/sms/normalizePhone.js
└── src/sms/providers/
    ├── mock.js
    ├── mnotify.js
    └── africastalking.js
```
