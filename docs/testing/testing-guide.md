# Testing & Quality Verification Guide

> **Test Suites, Automation Tools & Clinical Scenario Simulator**

---

## 1. Overview of Testing Layers

The YɛnCare platform employs a three-tier quality verification strategy:

1. **Automated Backend Tests**: Built with Node.js's native test runner (`node:test`), testing Mongoose schemas, migration scripts, phone parsing, reference generation, SMS providers, and HTTP controllers.
2. **Build & Type Checking**: TypeScript strict compilation in `ui/prototype` and Vite production bundling across `ui/prototype` and `frontend/`.
3. **Interactive Scenario Simulation**: In-browser control panel (`ProtoToolbar`) for live demonstration, edge-case testing, and clinical stakeholder reviews.

---

## 2. Backend Automated Test Suite (`backend/`)

The backend test suite is executed using Node.js's built-in test runner. No external testing dependencies (like Jest or Mocha) are required.

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

### 2.2 Running an Individual Test File
You can run any specific test file directly using Node.js:

```bash
cd backend
node --test ./test/patientsHttp.test.js
node --test ./test/normalizePhone.test.js
node --test ./test/referenceCode.test.js
```

### 2.3 Test File Catalog & Responsibilities

| Test File | Target Area | What It Validates |
|---|---|---|
| `test/patientsHttp.test.js` | Express HTTP Layer | `POST /api/patients` (200/201/400/409), `GET /api/patients/:identifier` (200/404), `GET /health` |
| `test/patientsService.test.js` | Patient Domain Logic | Find-or-create matching by student index or phone, 409 conflict detection between mismatched identities |
| `test/validatePatient.test.js` | Validation & Aliasing | camelCase vs snake_case aliases, 8-digit student index validation, required fields |
| `test/normalizePhone.test.js` | Ghana Phone Formatting | E.164 conversion (`+233...`), local 0-prefix formatting (`024...`), invalid number rejection |
| `test/referenceCode.test.js` | Token Generator | Format `YC-XXXX`, character set uniformity, collision retry budget |
| `test/models.test.js` | Mongoose Models | Schema constraints, pre-save foreign key checks, cascading slot release on delete |
| `test/migration.test.js` | Database Schema Migrations | Index conflict detection, idempotency of migration script in dry-run mode |
| `test/sendSms.test.js` | SMS Abstraction Layer | Mock fallback when credentials are empty, error handling, parameter validation |
| `test/mnotify.test.js` | mNotify Provider | Payload formatting, local phone number translation |

---

## 3. Frontend & Prototype Build Verification

To ensure that components, styles, and dependencies compile without syntax or module resolution errors:

### 3.1 Validate Interactive Clinical Prototype
```bash
# Compiles TypeScript and builds Vite bundle
npm run build
```
*(Executes `vite build` in `ui/prototype`)*.

### 3.2 Validate Public Web Frontend
```bash
npm run build:frontend
```
*(Executes `vite build` in `frontend`)*.

---

## 4. In-Browser Scenario Simulator (`ProtoToolbar`)

The interactive clinical prototype (`ui/prototype`) includes a floating floating scenario controller (`ProtoToolbar`) positioned at the bottom right of the screen.

It enables instant testing of clinical and network scenarios without manual database manipulation:

### 4.1 Session Progressor
After booking an appointment or finding an existing student record:
- Step the patient's live visit state through:
  `BOOKED` &rarr; `CHECKED_IN` &rarr; `WAITING` &rarr; `CALLED (Room 1/2)` &rarr; `COMPLETED`.

### 4.2 Scenario Injections
- **`+ Simulate Walk-in (W-024)`**: Injects an unscheduled student walk-in into the active queue to test token distinction and priority.
- **`Mark YC-4822 No-Show`**: Simulates a patient missing their appointment, verifying slot release and queue recalibration.
- **`Staff Change current to 10:30`**: Simulates a doctor-initiated schedule adjustment, displaying the clinical reason alert on the student's dashboard.
- **`Toggle After-Hours (P19)`**: Toggles the clinic between open hours and after-hours emergency mode.
- **`Network State Selector`**: Toggles between `online`, `poor`, `offline` (renders G01 recovery screen with cached reference code), and `restored`.
- **`All Screens Grid`**: Direct one-click navigation to any of the 19 patient screens or 11 staff workstation views.
