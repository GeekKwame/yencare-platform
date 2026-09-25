# Testing & Quality Verification Guide

> **Official Test Suite Documentation, Quality Assurance Runbooks & Simulator Controls**

---

## 1. Overview of Testing Layers

The YɛnCare platform employs a comprehensive multi-tier quality verification strategy:

1. **Automated Backend Tests (`node:test`)**: Built with Node.js's native test runner (zero external test runner dependencies). Covers schemas, migrations, clinical domain logic, student booking caps, visit-day guards, OTP security, rate limiting, and centralized RBAC matrix.
2. **End-to-End Automation (`@playwright/test`)**: Hermetic browser test suite testing real cross-browser user workflows (reception check-in, doctor room advance, self-arrival, no-show release).
3. **Build & Type Checking**: TypeScript strict compilation (`tsc -b`) and Vite production bundling across `ui/prototype` and `frontend/`.
4. **Interactive Scenario Simulation**: In-browser control panel (`ProtoToolbar`) for live demonstration, edge-case testing, and clinical stakeholder reviews.

---

## 2. Backend Automated Test Suite (`backend/`)

### 2.1 Running All Backend Tests
From the repository root:
```bash
npm run test:backend
```
Or from the `backend/` directory:
```bash
cd backend
npm test
```

### 2.2 Suite Metrics
- **Current Total**: **391 tests** across **94 suites** (`pass 391, fail 0`).
- **Execution Time**: ~37 seconds.

### 2.3 Test Suite Catalog

| Test File | Category | Focus & Test Coverage |
|---|---|---|
| `test/configEnv.test.js` | DevOps / Infrastructure | Validates startup environment validator (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `MNOTIFY_KEY`), diagnostic banner formatting, and fail-fast assertions. |
| `test/rbac.test.js` | Auth / Security | Validates centralized `hasPermission` helper (e.g. `APPOINTMENTS_CHECKIN`, `QUEUE_CALL_NEXT`, `QUEUE_ADVANCE`) and HTTP middleware permission enforcement. |
| `test/appointmentOwnership.test.js` | Security / Auth Bypass | Verifies rejection of forged/unverified tokens on cancel and reschedule; asserts actor identity is server-derived only. |
| `test/rateLimit.test.js` | Security / Anti-Abuse | Verifies per-IP rate limiting on public lookup endpoints and arrival brute-force protection (5 attempts / 15 min). |
| `test/bookAppointmentHardening.test.js` | Clinical Policy | Enforces student active booking limit (max 2 active bookings), same-day double-booking guard (HTTP 409), and past-slot rejection. |
| `test/visitDayGuard.test.js` | Clinical Policy | Enforces arrival window (60m early to 15m late) and no-show grace period rules. |
| `test/patientsHttp.test.js` | HTTP Layer | `POST /api/patients`, `GET /api/patients/:id`, identifier formatting, `GET /health`. |
| `test/staffAuthHttp.test.js` & `staffAuthHardening.test.js` | Authentication | Staff sign-in, JWT issuance, token refresh, demo account policy, and doctor workstation isolation. |
| `test/appointmentOtp.test.js` | Security / Verification | SMS OTP generation, expiration, validation, and staff bypass for appointment reschedule and cancellation. |
| `test/appointmentAudit.test.js` | Compliance & Auditing | Comprehensive immutable audit logging for appointment operations with actor tracking. |
| `test/queueEngine.test.js` | Virtual Queue | Room assignment, token advancement, SSE real-time event emission, and no-show slot release. |

---

## 3. End-to-End (E2E) Test Suite (`e2e/`)

Playwright automated tests verify real browser interactions against live backend and frontend instances:

```bash
# Run all E2E tests headless
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui
```

### E2E Suite Coverage (21 Tests)
1. **Visit-Day Check-In Guards**: Reception cannot check in future-dated bookings; allowed on visit date.
2. **Patient Self-Arrival**: Enforces arrival window boundaries and feedback messages.
3. **Doctor Consultation Flow**: Doctor workstation loads assigned patient queue, calls next patient, and advances consultation state.
4. **No-Show Boundary Verification**:
   - Marking no-show inside grace period is refused with 400 and exact time countdown.
   - Marking no-show after grace period succeeds with 200, updates status, and immediately frees the time slot.

---

## 4. Production Build Verification

Verify that client bundles build cleanly with zero errors:

```bash
# Compile and build clinical prototype
npm run build

# Compile and build production web frontend
npm run build:frontend
```

---

## 5. In-Browser Scenario Simulator (`ProtoToolbar`)

The interactive clinical prototype includes a floating scenario controller (`ProtoToolbar`) at the bottom right of the screen:
- **Session Progressor**: Steps visits through `BOOKED` &rarr; `CHECKED_IN` &rarr; `WAITING` &rarr; `CALLED` &rarr; `COMPLETED`.
- **Walk-In Simulator**: Injects unscheduled walk-in patients (`W-024`) with priority queue handling.
- **Doctor Reschedule Alert**: Simulates schedule changes and confirms real-time notification alerts.
- **Offline / Network Simulator**: Tests degraded network states and `ConnectivityBanner` reconnect behaviors.
