# YɛnCare backend

Express API + MongoDB for Gate 2, plus the SMS wrapper. Patient registration follows the interactive prototype: **P02 Your Details** (register) and **P09 Find** (lookup by student index or Ghana phone). It writes to the Mongoose `Patient` collection (`phone`, `studentIndex`, `nhisNumber`).

Schema, indexes, and booking write path: [`docs/DATABASE_ARCHITECTURE.md`](./docs/DATABASE_ARCHITECTURE.md).

---

## Patient registration & verification

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/health` | Readiness. **200** when Mongo pings; **503** if the database is down. Body includes `db` and `latencyMs`. |
| `POST` | `/api/auth/staff-login` | Staff JWT login (email or Staff ID + password) |
| `POST` | `/api/auth/staff-refresh` | Exchange a still-valid staff token for a fresh 12h one (**Bearer token**) |
| `GET` | `/api/auth/staff-me` | Current staff profile (**Bearer token**) |
| `POST` | `/api/patients` | Find-or-create by student index and/or Ghana phone. Public callers get **200** `{ id }` only; a **receptionist/admin JWT** gets the full record |
| `GET` | `/api/patients/:identifier` | Lookup by student index or Ghana phone — **receptionist/admin JWT** |
| `GET` | `/api/appointments` | List appointments — **staff JWT** (`date=YYYY-MM-DD`, `clinicSite` or `clinic`) |
| `POST` | `/api/appointments` | Book appointment & automatically dispatch SMS |
| `GET` | `/api/appointments/:reference` | Lookup booking by `referenceCode` (e.g. `YC-4821`) |
| `GET` | `/api/appointments/lookup` | Patient search by `reference`, `studentIndex`, or `phone` (exactly one) |
| `GET` | `/api/appointments/:reference/queue-status` | Real-time position, estimated wait, and room token |
| `PATCH` | `/api/appointments/:id/status` | Desk status change — **receptionist/admin JWT** |
| `PATCH` | `/api/appointments/:id/cancel` | Cancel — **staff JWT, or a valid `otpCode` in the body** |
| `PATCH` | `/api/appointments/:id/reschedule` | Move to `newSlotId` — **staff JWT, or a valid `otpCode` in the body** |
| `POST` | `/api/queue/call-next` | Call next patient — **doctor/admin JWT** |
| `POST` | `/api/queue/advance` | Complete consultation — **doctor JWT** |
| `POST` | `/api/queue/no-show` | Mark no-show — **staff JWT** |
| `GET` | `/api/rooms` | Seeded rooms (`id` → `roomId`) |
| `GET` | `/api/clinicians` | Seeded clinicians (`id` → `clinicianId`) |
| `GET` | `/api/time-slots` | Seeded slots (`id` → `timeSlotId`; filter `date`, `clinicSite`, `available`) |

No auth on **patient** registration, booking, appointment lookup, or catalog routes. `GET /api/patients/:identifier` is reception/admin only. Identifier is an 8-digit KNUST index (`20612345`) or a Ghana number (`0247001122`, `024 700 1122`, `+233247001122`). Encode `+` in URLs as `%2B`.

**Cancel and reschedule need proof of ownership.** A verified staff token (receptionist / doctor / admin) is enough on its own; staff never need a code. Patients must send `otpCode`: the 4-digit code texted to the phone on record by `POST /api/appointments/:id/request-cancel-otp` or `POST /api/appointments/:id/request-reschedule-otp`. A code is valid for 10 minutes, for one use, for that appointment and that action only, and is locked after 5 wrong attempts. A phone number in the body does not prove ownership. Otherwise the API answers **403**:

- no code supplied → `A valid OTP verification code (otpCode) is required to cancel this appointment unless initiated by staff.` (or `…to reschedule…`)
- wrong, expired, used or locked code → the verification error for that code. The code is checked before the appointment is looked up, so an unknown reference cannot be told apart from a wrong code.

Patients also cannot cancel or reschedule once they are `WAITING` in the live queue (**400**, `You are already in the live queue for today. Please speak to reception to cancel or change this appointment.`); reception still can, and doing so clears the queue token.

**Rate limits.** The reference-code endpoints (`GET /api/appointments/:reference`, `GET /api/appointments/lookup`, both mutations) allow 30 requests/minute/IP; `queue-status` allows 120/minute/IP plus 30/minute per IP+reference. Public `POST /api/patients` allows 10 requests per 15 minutes per IP; requests with a verified receptionist/admin token skip that limit and do not count toward it. Over the limit is **429** with `Retry-After`. Limits are active in every environment except test runs (`PUBLIC_LOOKUP_RATE_MAX`, `QUEUE_STATUS_RATE_MAX`, `QUEUE_STATUS_REFERENCE_RATE_MAX`, `PATIENT_REGISTER_RATE_MAX`, `RATE_LIMIT_DISABLED`). `RATE_LIMIT_DISABLED` is ignored when `NODE_ENV=production` (including Render staging); raise the `*_RATE_MAX` values there instead. Per-reference limits treat a reference the same however it is spaced or cased (` yc-4821 ` counts as `YC-4821`).

**Opening hours are enforced server-side.** Scheduled bookings outside the target clinic's hours are **400**: Students' Clinic is Monday–Friday 08:00–16:00 Accra, KNUST Hospital is 24h. Staff walk-ins (`bookingType: "WALK_IN"`) are exempt.

Every response carries an `X-Request-Id` header, and error bodies repeat it as `requestId` for end-to-end tracing.

Staff workstation routes require `Authorization: Bearer <token>` from `POST /api/auth/staff-login`. Demo accounts (password `yencare`): `abena.osei@yencare.gh` (receptionist), `kwame.boateng@yencare.gh` (doctor), `kojo.mensah@yencare.gh` (admin).

### Status codes

| Status | When |
|---|---|
| **200** | Public `POST` found or created the patient (the status does not say which); staff `POST` found an existing patient; staff `GET` lookup succeeded |
| **201** | Staff `POST` inserted a new patient |
| **400** | Invalid JSON, invalid student index, or invalid Ghana phone |
| **401** / **403** | `GET` without a valid receptionist/admin token |
| **404** | Staff `GET` — no patient for that identifier |
| **409** | Public `POST` — the details could not be matched: no phone, a phone that is not the one on record, or an index and phone that belong to different patients. Always `We couldn't confirm these details. Please check them, or see reception for help.` so the response never confirms whether an index or phone is registered. Staff `POST` — `This student index and phone number belong to different patients` |
| **429** | Public `POST` over the registration rate limit |
| **500** | Unexpected server error |

### Field mapping

JSON (frontend / Postman) uses camelCase. MongoDB uses the Mongoose names.

| JSON (request aliases) | MongoDB / populate / SMS | Rules |
|---|---|---|
| `fullName`, `full_name`, `patientName` | `fullName` | Required **to create**. 2–120 characters |
| `studentIndex`, `student_index` | `studentIndex` | Optional for walk-ins. If present: **exactly 8 digits** |
| `phone`, `phoneNumber`, `phone_number` | **`phone`** | Required **to create**. Ghana mobile; stored as E.164 (`+233…`) |
| `nhisNumber`, `nhis`, `nhis_number` | **`nhisNumber`** | Optional |

Full records include **both** `phone` and `phoneNumber` (same E.164 value) so Able’s `.populate('patientId', 'fullName phone studentIndex')` and the web client never read `undefined` for SMS.

A public `POST` must include a phone. When the index or phone matches an existing patient, the phone must be the one on record, and the record is returned unchanged. Only a receptionist/admin token can change an existing patient's phone, name or NHIS, or look a patient up by index or phone alone. Creating a **new** row also needs `fullName` and a valid phone (P02 + `Patient` schema).

### Response body

Public `POST` (no staff token), whether the patient was found or created:

```json
{ "id": "68bf2c0e9c1a2b0012345678" }
```

Staff `POST` and `GET` (receptionist/admin token):

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
- [http://localhost:4000/health](http://localhost:4000/health) → `{ "ok": true, "service": "yencare-api", "db": "connected", "latencyMs": … }` when Mongo is up

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
- `JWT_SECRET` (Render can generate this from the blueprint; if the service already exists, add it under Environment)
- `CORS_ORIGIN=https://yencare-platform.vercel.app`

Recommended defaults for staging:
- `NODE_ENV=production`
- `SMS_PROVIDER=mnotify`
- `PORT=4000`
- `MONGO_MIN_POOL_SIZE=10`
- `MONGO_MAX_POOL_SIZE=50`

Verification checklist:
1. Trigger a Render deploy from `main`.
2. Open `https://yencare-api-staging.onrender.com/health`.
3. Confirm HTTP `200` and body includes `"ok": true`, `"db": "connected"`, and `latencyMs`.
4. Confirm secrets are only set in Render dashboard and not committed to Git.

### Postman

1. Start the API (`npm run dev` in `backend`). Confirm `GET http://localhost:4000/health` returns **200**.
2. For POST, set header `Content-Type: application/json`. `POST /api/patients` needs no auth; `GET /api/patients/:identifier` needs `Authorization: Bearer <token>` from a receptionist/admin `POST /api/auth/staff-login`.

**Register (create)** — `POST http://localhost:4000/api/patients`

```json
{
  "fullName": "Efua Darko",
  "studentIndex": "20620111",
  "phoneNumber": "024 700 1122",
  "nhis": "12345678"
}
```

Without a token, both the first send and a repeat → **200** `{ id }` with the same `id`. With a receptionist token, the first send → **201** and a repeat → **200**, both with the full record.

| Request | Expect |
|---|---|
| `GET http://localhost:4000/api/patients/20620111` (receptionist token) | **200** by student index |
| `GET http://localhost:4000/api/patients/0247001122` (receptionist token) | **200** by local phone |
| `GET http://localhost:4000/api/patients/%2B233247001122` (receptionist token) | **200** (`+` encoded as `%2B`) |
| `GET http://localhost:4000/api/patients/20699999` (receptionist token) | **404** |
| `GET http://localhost:4000/api/patients/20620111` (no token) | **401** |
| POST `"studentIndex": "20620111"` only, no token | **409** (a public caller must give the phone on record) |
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
| `clinicSite` | Yes | `students-clinic` or `knust-hospital` |
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

Both this endpoint and `GET /api/appointments/lookup` add two fields on top of the serialized appointment, so a reference that is no longer live cannot be mistaken for one that is:

| Field | Type | Meaning |
|---|---|---|
| `isHistorical` | boolean | `true` when status is `CANCELLED`, `NO_SHOW`, or `COMPLETED` |
| `supersededBy` | object \| null | When `isHistorical`, the patient's current active appointment (`BOOKED`/`CHECKED_IN`/`WAITING`/`CALLED`, earliest by date then time) in the same serialized shape, else `null`. Its own `supersededBy` is always `null`. |

```json
{
  "referenceCode": "YC-4821",
  "status": "CANCELLED",
  "isHistorical": true,
  "supersededBy": {
    "referenceCode": "YC-7734",
    "status": "BOOKED",
    "appointmentDate": "2026-09-18",
    "isHistorical": false,
    "supersededBy": null
  }
}
```

---

## Virtual Queue Engine & Token Progression

State machine managing patient flow through consultation rooms with non-colliding daily sequence tokens and strict FIFO room ordering.

### Token Progression Lifecycle

```
BOOKED ──(reception check-in)──> CHECKED_IN ──(enter queue)──> WAITING ──(call next)──> CALLED ──(advance)──> COMPLETED
  │                                   │                           │                        │
  └───(no-show/cancel)────────────────┴───────(no-show)───────────┴───────(no-show)────────┴───────(no-show)──> NO_SHOW
```

- **Daily Non-Colliding Tokens**: When an appointment transitions to `CHECKED_IN`, an incremental daily token is assigned (e.g. `A-01` for Room 1, `B-04` for Room 2). Sequence numbers reset at 00:00 **Africa/Accra** daily via atomic MongoDB `$inc` on `QueueCounter`.
- **Dynamic Estimated Wait Time**: Calculated dynamically as:
  $$\text{Estimated Wait (min)} = (\text{Remaining patients ahead in room}) \times 15\text{ min}$$
- **Automated Call SMS Alert**: When a patient is called (`call-next`), a notification SMS is immediately dispatched alerting them to proceed to their consultation room.

### Queue Endpoints

#### 1. Real-Time Queue Status (`GET /api/appointments/:reference/queue-status`)
Returns real-time queue position, dynamic wait time, and room token for Screen P18:
```json
{
  "referenceCode": "YC-4821",
  "status": "WAITING",
  "queueToken": "A-02",
  "position": 2,
  "patientsAhead": 1,
  "estimatedWaitMinutes": 15,
  "roomToken": "A-01",
  "nowServingToken": "A-01",
  "room": { "id": "68bf2c0e9c1a2b0012345672", "name": "Room 1", "clinicSite": "students-clinic" },
  "clinician": { "id": "68bf2c0e9c1a2b0012345671", "name": "Dr. Kwame Boateng", "title": "Senior Medical Officer" }
}
```

#### 2. Call Next Patient (`POST /api/queue/call-next`)
Calls the next waiting patient in strict FIFO order (`queueSequence: 1, checkInTime: 1, createdAt: 1`):
```json
// POST /api/queue/call-next
{
  "roomId": "68bf2c0e9c1a2b0012345672"
}
```

#### 3. Advance Queue (`POST /api/queue/advance`)
Advances an individual appointment through the state machine, or completes a room's active consultation:
```json
// Advance specific appointment:
{ "referenceCode": "YC-4821" }

// OR complete room's active consultation:
{ "roomId": "68bf2c0e9c1a2b0012345672", "callNext": true }
```

#### 4. Mark No-Show (`POST /api/queue/no-show`)
Transitions appointment to `NO_SHOW`, releases linked time slot, and clears active counter:
```json
{
  "referenceCode": "YC-4821",
  "reason": "Did not appear after 3 calls"
}
```

### curl

```bash
curl -s -X POST http://localhost:4000/api/patients -H "content-type: application/json" -d "{\"fullName\":\"Efua Darko\",\"studentIndex\":\"20620111\",\"phoneNumber\":\"024 700 1122\"}"
curl -s http://localhost:4000/api/patients/20620111 -H "authorization: Bearer $RECEPTION_TOKEN"
curl -s http://localhost:4000/api/appointments/YC-4821/queue-status
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
├── src/http/                   # app, /api/patients, /api/appointments, /api/queue, catalog
├── src/services/               # queueEngine (FIFO & tokens), bookAppointment, appointmentOps
├── src/db/                     # mongoose connection + collection specs
├── src/models/                 # Patient, Appointment, Clinician, Room, TimeSlot, QueueCounter
├── src/patients/               # validate + find-or-create + phone/NHIS field aliases
├── src/sms/sendSms.js
├── src/sms/normalizePhone.js
└── src/sms/providers/
    ├── mock.js
    ├── mnotify.js
    └── africastalking.js
```
