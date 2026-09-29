# YɛnCare REST API Specification

> **Official HTTP API & RBAC Specification for Backend Services**  
> Base URL (Local Development): `http://localhost:4000`  
> Base URL (Staging Production): `https://yencare-api-staging.onrender.com`  
> API Base Path: `/api`

---

## 1. Overview & General Conventions

The YɛnCare backend exposes a high-performance RESTful JSON API supporting outpatient appointment booking, staff workstation operations, live virtual queue coordination, and corridor digital displays.

### Content Negotiation & Payload Limits
- Requests with bodies **must** supply:
  ```http
  Content-Type: application/json
  ```
- All responses return UTF-8 encoded JSON.
- Request payload size is capped at **32 KB** (`express.json({ limit: '32kb' })`).

### Authentication & Centralized RBAC
- **Public Endpoints**: Patient registration (`POST /api/patients`, which returns only `{ id }` to public callers), booking (`POST /api/appointments`), appointment lookup with reference + booking phone (§6.5), self-arrival (`POST /api/appointments/:ref/arrive`), queue status, and public display boards do not require staff tokens.
- **Staff Endpoints**: Protected via JWT Bearer authentication:
  ```http
  Authorization: Bearer <STAFF_JWT_TOKEN>
  ```
- **RBAC Matrix**: Permissions are centralized via `hasPermission(user, permission)`:
  - `RECEPTIONIST`: Front-desk check-in, roster view, walk-in registration, mark no-show, reschedule.
  - `DOCTOR`: Workstation consultation queue, call next patient, advance/complete visit, mark no-show.
  - `ADMIN`: Full administrative control, system diagnostics, and emergency overrides.

### Security & Rate Limiting
- Public lookup and self-arrival endpoints enforce strict per-IP / per-reference rate limiting:
  - Reference lookups: 30 requests/minute per IP
  - Queue status polling: 120 requests/minute per IP (30 req/min per specific reference code)
  - Arrival check-in: 5 attempts per 15 minutes per IP/reference (brute-force defense)
  - Public patient registration (`POST /api/patients`): 10 requests per 15 minutes per IP (`PATIENT_REGISTER_RATE_MAX`); requests with a verified receptionist/admin token skip this limit and do not count toward it
- Unverified tokens on cancel and reschedule are rejected; actor identity in audit trails is server-derived only.

---

## 2. Service Health & Diagnostics

### 2.1 Health Probe
```http
GET /health
```
Liveness and readiness probe for container supervisors, Render uptime, and Vercel frontends.

#### Response (`200 OK` / `503 Service Unavailable`)
```json
{
  "ok": true,
  "service": "yencare-api",
  "db": "connected",
  "readyState": 1,
  "latencyMs": 8
}
```

---

## 3. Staff Authentication & RBAC Endpoints

### 3.1 Staff Sign-In
```http
POST /api/auth/staff-login
```
Authenticates clinical staff (Receptionist, Doctor, Admin) using either **email** or **Staff ID** (`stf_01`).

#### Request Body
```json
{
  "identifier": "abena.osei@yencare.gh",
  "password": "demo-password"
}
```

#### Response (`200 OK`)
```json
{
  "token": "eyJhbGciOi...",
  "staff": {
    "id": "68bf2c0e9c1a2b0011111111",
    "staffId": "stf_01",
    "name": "Abena Osei",
    "email": "abena.osei@yencare.gh",
    "role": "RECEPTIONIST",
    "clinicSite": "students-clinic",
    "assignedRoom": null
  }
}
```

### 3.2 Token Refresh
```http
POST /api/auth/staff-refresh
```
Exchanges a valid, unexpired token for a fresh token with renewed 8-hour validity.

### 3.3 Active Staff Profile
```http
GET /api/auth/staff-me
```
Returns authenticated staff session details and assigned clinic room.

---

## 4. Patient Registration & Lookup

### 4.1 Patient Find-or-Create
```http
POST /api/patients
```
Finds an existing student record by Ghana phone number or 8-digit KNUST student index. If not found, creates a new record.

#### Request Body
```json
{
  "fullName": "Akosua Boateng",
  "studentIndex": "20612345",
  "phoneNumber": "0241234567",
  "nhisNumber": "12345678"
}
```

#### Public callers (no staff token)
- A phone is required. When the index or phone matches an existing patient, the phone must be the one on record; the record is never changed.
- Response `200 OK` whether the patient was found or created:
  ```json
  { "id": "68bf2c0e9c1a2b0012345678" }
  ```
- Any failed match (no phone, a phone that is not the one on record, or an index and phone that belong to different patients) returns `409` with the same body, so the response never confirms whether an index or phone is registered:
  ```json
  { "error": "We couldn't confirm these details. Please check them, or see reception for help." }
  ```
- Rate-limited to 10 requests per 15 minutes per IP (`429` with `Retry-After`).

#### Reception / admin (`RECEPTIONIST` or `ADMIN` token)
- May look a patient up by index or phone alone, and may update an existing patient's phone, name or NHIS.
- Response `201 Created` for a new patient, `200 OK` for an existing one, with the full record (`id`, `fullName`, `studentIndex`, `phone`, `phoneNumber`, `nhisNumber`, `nhis`, `createdAt`, `updatedAt`).
- A conflict returns `409` with `This student index and phone number belong to different patients`.

### 4.2 Patient Lookup
```http
GET /api/patients/:identifier
```
*Requires Staff Authentication (`RECEPTIONIST`, `ADMIN`).* Looks a patient up by 8-digit student index or Ghana phone and returns the full record. `401` without a valid token, `403` for other roles, `404` when no patient matches.

---

## 5. Clinic Catalog Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rooms` | Lists active consultation rooms across clinic sites |
| `GET` | `/api/clinicians` | Lists available doctors, titles, specialties, and assigned rooms |
| `GET` | `/api/time-slots` | Lists consultation slots filtered by `date`, `clinicSite`, `clinicianId`, and `available` |

---

## 6. Appointment Operations

### 6.1 Create Appointment
```http
POST /api/appointments
```
Books an outpatient consultation slot.
- **Student Booking Cap**: Enforces a strict maximum of **2 active bookings** (`BOOKED`, `CHECKED_IN`, `WAITING`) per student index.
- **Double-Booking Guard**: Prevents booking duplicate appointments for the same student on the same date (HTTP `409 Conflict`).

### 6.2 Staff Appointment Roster
```http
GET /api/appointments?date=YYYY-MM-DD&clinicSite=students-clinic
```
*Requires Staff Authentication (`RECEPTIONIST`, `DOCTOR`, `ADMIN`).*

### 6.3 Cancel Appointment
```http
PATCH /api/appointments/:id/cancel
```
- **Patients**: Requires a valid 4-digit OTP code (`otpCode`) sent to the phone on record via `POST /api/appointments/:id/request-cancel-otp`. A phone number in the body is not enough.
- **Staff**: Allows instant cancellation without OTP if signed in with a valid staff token.

### 6.4 Reschedule Appointment
```http
PATCH /api/appointments/:id/reschedule
```
Moves an appointment to a new available time slot.
- **Patients**: Requires a valid 4-digit OTP code (`otpCode`) sent to the phone on record via `POST /api/appointments/:id/request-reschedule-otp`. A cancel code cannot be used to reschedule, and a phone number in the body is not enough.
- **Staff**: Receptionist, doctor or admin with a verified token may reschedule without an OTP.

### 6.5 Appointment Lookup
```http
GET /api/appointments/:reference
GET /api/appointments/lookup?reference=YC-4821
X-Booking-Phone: 024 123 4567
```
- **Public callers** must send both the reference and the phone number used for the booking. The phone goes in the **`X-Booking-Phone`** request header, never in the URL; a `?phone=` query parameter is ignored for public callers.
- `200 OK`: the appointment, with the patient's phone and student index masked.
- `400 Bad Request` when the phone header is missing, whatever the reference: `{ "error": "Enter the phone number used for this booking." }`
- `404 Not Found` for an unknown reference **and** for a wrong phone, with the same body, so a reference cannot be confirmed by guessing: `{ "error": "Appointment not found or phone number does not match" }`
- **Staff** (`RECEPTIONIST`, `DOCTOR`, `ADMIN` token) may look up by reference alone; `/lookup` also accepts `studentIndex` or `phone`.
- Logged request paths mask phone numbers, student indexes, NHIS numbers, OTP codes, tokens and passwords; booking references stay readable.

---

## 7. Virtual Queue Coordination

### 7.1 Patient Arrival Check-In
```http
POST /api/appointments/:reference/arrive
```
Marks the student as arrived. Enforces visit-day guards:
- Only permitted on the day of the appointment.
- Permitted within 60 minutes before slot start up to 15 minutes after slot start.
- Rate-limited to 5 attempts per 15 minutes per IP/reference.
- Needs only the reference, so the `200 OK` response is minimal and carries no personal details:
  ```json
  {
    "id": "68bf2c0e9c1a2b0012345678",
    "referenceCode": "YC-4821",
    "status": "CHECKED_IN",
    "appointmentDate": "2026-09-30",
    "appointmentTime": "10:00",
    "clinicSite": "students-clinic",
    "queueToken": null,
    "checkInTime": "2026-09-30T09:12:00.000Z"
  }
  ```

### 7.2 Real-time Queue Status
```http
GET /api/appointments/:reference/queue-status
```
Works with the reference alone and returns no personal details (no name, phone, student index, NHIS number or notes). Fields: `referenceCode`, `status`, `appointmentDate`, `appointmentTime`, `clinicSite`, `queueToken`, `position`, `patientsAhead`, `estimatedWaitMinutes`, `roomToken`, `nowServingToken`, `room` (`id`, `name`, `clinicSite`), `clinician` (`id`, `name`, `title`). An unknown reference returns `404`. Used by the patient Queue page, Clinic Activity and the home page booking card.

### 7.3 Doctor Consultation Controls
- `POST /api/queue/call-next`: Calls next waiting patient into doctor's consultation room. *(Doctors & Admin only)*
- `POST /api/queue/advance`: Completes active patient visit and marks consultation finished. *(Doctors only)*
- `POST /api/queue/no-show`: Marks a patient who failed to arrive after late grace period as `NO_SHOW`.
