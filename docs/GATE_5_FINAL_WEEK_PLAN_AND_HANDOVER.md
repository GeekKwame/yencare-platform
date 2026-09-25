# Gate 5 Final Week Master Plan & Capstone Handover

**Project Title**: YɛnCare — Outpatient Clinic Appointment Booking & Live Virtual Queue Platform  
**Target Institutions**: KNUST University Health Services (Students' Clinic & KNUST Hospital)  
**Milestone**: Gate 5 (Week 5 — Final Defense, Live Clinical Simulation & Stakeholder Handover)  
**Execution Period**: Monday, 28 September 2026 – Friday, 2 October 2026  
**Final Submission & Defense Date**: Friday, 2 October 2026  
**Team Lead & Coordinator**: Blessing Edmund Kwame Dogbe  
**Engineering Team**: Able Kafu Azanda, Sterling Awuley, Raymond Badu Afrani, Harry “Ephraim” Nartey, Emmanuella Lodonu  
**Evaluator Body**: AmaliTech Training Academy & Evaluation Board  

---

## 1. Final Week Objective

The primary objective of the Final Week (Gate 5) is to transition YɛnCare from its audited, feature-complete engineering state into an evaluator-ready capstone showcase and sustainable institutional software asset. 

Having achieved a 100% green CI pipeline (391 backend unit tests passing, 37 Playwright E2E browser tests passing, and 100% clean production Vite builds) in Week 4, the engineering team will focus strictly on:
1. **Closing Audited Code Hygiene & Defense Gaps**: Resolving the 12 frontend ESLint warnings and adding generic NoSQL recursive operator sanitization middleware.
2. **Cloud Staging Verification**: Validating the live Render staging backend host (`yencare-api-staging.onrender.com`), confirming Atlas database connectivity, and testing real-world Ghana SMS delivery via mNotify.
3. **Live Multi-Role Clinical Simulation**: Conducting end-to-end rehearsals simulating peak morning outpatient intake across the student web client, reception desk, doctor workstation, and public corridor digital display.
4. **Final Presentation & Capstone Defense**: Delivering a high-impact 15-minute presentation, architectural walkthrough, and live demonstration before the AmaliTech CSR Evaluation Board.
5. **Project Archive & Handover**: Delivering complete documentation runbooks, deployment guides, and signed-off deliverables for KNUST University Health Services.

---

## 2. Remaining Tasks & Engineering Cards

The remaining work is prioritized logically to eliminate risks early in the week and dedicate the final days to rehearsal and presentation polish:

### [PRIORITY 1] Task 1: Defense-in-Depth Generic NoSQL Operator Sanitizer
- **Task Code**: `[SEC-NOSQL]` (also completes `[SEC-DATA]`)
- **Status**: **COMPLETED (Verified & Sanitized)**
- **Lead Owner**: Emmanuella Lodonu (Backend & Security)
- **Support**: Able Kafu Azanda (Backend Lead)
- **Description**: While Week 4 implemented strict field-level regex validation and string casting (`validate.js`), defense-in-depth requires generic recursive sanitization. Mounted middleware in `src/http/app.js` (`nosqlSanitizer` in `src/http/security.js`) that inspects `req.body`, `req.query`, and `req.params`, stripping keys beginning with `$` or containing `.`, as well as prototype pollution vectors.
- **Outcome**: Completely neutralizes NoSQL operator injection payloads across all existing and future endpoints without relying solely on per-route schemas.
- **Dependencies**: None.
- **Validation & Acceptance Criteria**:
  - Express middleware mounted before all route handlers (`app.js`).
  - Automated tests in `backend/test/securitySanitize.test.js` verifying that payloads containing `{ "$gt": "" }`, `{ "$ne": null }`, or dotted keys have operator keys removed (14/14 tests passing).
  - Zero regression across the backend test suite (405 passing tests across 98 suites).

---

### [PRIORITY 2] Task 2: Frontend Code Hygiene & React 19 ESLint Clean-Up
- **Task Code**: `[FE-LINT]`
- **Lead Owner**: Raymond B. Afrani (Frontend Lead)
- **Support**: Harry “Ephraim” Nartey (Fullstack)
- **Description**: Resolve the 12 ESLint problems (8 errors, 4 warnings) identified during the Week 4 audit:
  1. Remove unused `Button` component import in `ReviewBooking.jsx`.
  2. Refactor synchronous `setState` calls inside `useEffect` bodies in `WelcomeForm.jsx`, `ElapsedTimer.jsx`, `useClinicRoster.js`, and `ClinicActivity.jsx` into appropriate event callbacks or asynchronous loaders.
  3. Separate utility exports from component files in `StaffAuthContext.jsx` and `ElapsedTimer.jsx` to satisfy React fast-refresh rules.
  4. Add `npm --prefix frontend run lint` to the `.github/workflows/pr-ci.yml` workflow so regressions are automatically prevented in CI.
- **Expected Outcome**: Clean, warning-free frontend codebase conforming to modern React 19 standards.
- **Dependencies**: None.
- **Validation & Acceptance Criteria**:
  - `npm --prefix frontend run lint` exits cleanly with code 0 (`0 errors, 0 warnings`).
  - GitHub Actions `PR CI` runs frontend linting alongside production builds.

---

### [PRIORITY 3] Task 3: Render Staging Cloud Backend Verification & DNS Uptime
- **Task Code**: `[OPS-HOST]`
- **Lead Owner**: Blessing Edmund Kwame Dogbe (DevOps / Lead)
- **Support**: AmaliTech Cloud Infrastructure Support
- **Description**: Verify the live cloud staging deployment on Render (`https://yencare-api-staging.onrender.com`). Check the Render dashboard to ensure the web service is un-paused, provisioned under the designated subdomain, and bound to `render.yaml`. Verify that environment variables (`MONGODB_URI`, `JWT_SECRET`, `MNOTIFY_API_KEY`) match production requirements.
- **Expected Outcome**: Live backend responds to public health checks and handles cross-origin API calls from the live Vercel frontend (`https://yencare-platform.vercel.app`).
- **Dependencies**: Render cloud service dashboard credentials.
- **Validation & Acceptance Criteria**:
  - `curl -I https://yencare-api-staging.onrender.com/health` returns `200 OK` with database status `connected`.
  - Testing booking on `https://yencare-platform.vercel.app` successfully writes records to MongoDB Atlas and dispatches SMS.

---

### [PRIORITY 4] Task 4: End-to-End Live Clinical Simulation & Rehearsal
- **Task Code**: `[QA-SIM]`
- **Lead Owner**: Sterling Awuley (QA Lead)
- **Support**: All Team Members
- **Description**: Execute a realistic clinic morning simulation following `docs/testing/LIVE_TESTING_GUIDE.md`:
  - **Journey 1**: 3 student online bookings (KNUST Students' Clinic & KNUST Hospital).
  - **Journey 2**: Student self-service reschedule with SMS OTP verification.
  - **Journey 3**: Mobile arrival check-in within the 60m/15m arrival window.
  - **Journey 4**: Reception desk walk-in triage, desk check-in, and manual override.
  - **Journey 5**: Multi-room doctor workstations (Room 1 Dr. Kwame vs. Room 2 Dr. Ama) verifying clinician queue isolation, calling patients, and completing consultations.
  - **Journey 6**: Corridor Live Display (`/queue`) announcing tokens in real time.
- **Expected Outcome**: Verified smooth operational handoff between patient, reception, and doctor roles.
- **Dependencies**: Task 3 (Staging deployment active).
- **Validation & Acceptance Criteria**:
  - All 5 user journeys executed without UI crashes or unhandled server exceptions.
  - Zero data leakage between doctor consultation queues.
  - Real SMS delivered to Ghana phone numbers or logged in staging terminal.

---

### [PRIORITY 5] Task 5: Stakeholder Pitch Deck, Impact Modeling & Fallback Demo Video
- **Task Code**: `[SLIDES-DEMO]`
- **Lead Owner**: Raymond B. Afrani & Harry “Ephraim” Nartey
- **Support**: Blessing Edmund Kwame Dogbe
- **Description**:
  1. Produce a professional 15-minute presentation slide deck tailored for the AmaliTech Evaluation Board and KNUST University Health Services directors.
  2. Include clinical throughput modeling: quantify how virtual queuing and scheduled time slots reduce peak waiting room congestion by up to 65% at the Students' Clinic.
  3. Record a high-definition 3-minute video walkthrough showcasing the end-to-end clinical workflow as a contingency fallback in case of venue network interruptions.
- **Expected Outcome**: High-impact, visually compelling pitch materials and offline video backup.
- **Dependencies**: Task 4 (Simulation rehearsal).
- **Validation & Acceptance Criteria**:
  - Slide deck reviewed and approved by Team Lead.
  - 3-minute 1080p demo video archived locally in `docs/demo/`.
  - Timed rehearsal completed in under 15 minutes with 5 minutes reserved for evaluator Q&A.

---

### [PRIORITY 6] Task 6: Final Repository Bundling, Runbooks & Administrative Handover
- **Task Code**: `[HANDOVER]`
- **Lead Owner**: Blessing Edmund Kwame Dogbe (Lead)
- **Support**: Able Kafu Azanda (Backend Lead)
- **Description**: Complete the formal handover package for KNUST University Health Services IT staff:
  1. Audit and finalize all technical runbooks in `docs/` (`api/reference.md`, `operations/database-ops.md`, `operations/sms-providers.md`, `security/security-and-compliance.md`).
  2. Confirm `.env.example` templates across root, backend, and frontend are 100% synchronized with all environment variables validated in `config/env.js`.
  3. Tag the repository release `v1.0.0` on GitHub with complete release notes.
  4. Prepare an administrative handover sheet documenting credentials, seed accounts, and system maintenance commands.
- **Expected Outcome**: Turn-key project archive ready for long-term campus operation.
- **Dependencies**: All preceding tasks completed.
- **Validation & Acceptance Criteria**:
  - Clean `git clone` from scratch passes dependencies installation, database seed, and tests.
  - Complete documentation bundle exported as PDF runbooks.

---

## 3. Final Testing & Quality Verification Suite

Before presenting at Gate 5, the following test gates must remain green:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   YENCARE GATE 5 QUALITY VERIFICATION GATES             │
├────────────────────────────────┬───────────────────────┬───────────────┤
│ Verification Layer             │ Tooling / Command     │ Target Metric │
├────────────────────────────────┼───────────────────────┼───────────────┤
│ Backend Unit & Integration     │ npm run test:backend  │ 391+ Passing  │
│ End-to-End Browser Automation  │ npm run test:e2e      │ 37+ Passing   │
│ Client Bundle: Frontend        │ npm run build:frontend│ 0 Build Errors│
│ Client Bundle: Prototype       │ npm run build         │ 0 Build Errors│
│ Code Hygiene: Frontend Linter  │ npm run lint          │ 0 Errors/Warn │
│ Staging API Health Check       │ GET /health           │ 200 OK (db:1) │
│ Mobile Responsive Layout       │ Chrome DevTools 320px │ Zero Clipping │
└────────────────────────────────┴───────────────────────┴───────────────┘
```

---

## 4. Production & Deployment Readiness Checklist

- [ ] **Database Connection Pooling**: Mongoose pool configured with `minPoolSize=10` and `maxPoolSize=50` to absorb morning student check-in concurrency.
- [ ] **Fail-Fast Startup Validation**: `backend/src/config/env.js` active; halts boot if `PORT`, `MONGODB_URI`, `JWT_SECRET`, or `MNOTIFY_API_KEY` are invalid.
- [ ] **Production Secret Hardening**: Verify that placeholder secrets (`change-me-in-staging`, `yencare-dev-jwt-secret`) are strictly blocked in production mode.
- [ ] **SMS Gateway Reliability**: Confirm mNotify Ghana account balance, ensure sender ID `YenCare` is approved, and verify mock provider fallback triggers smoothly if SMS API key is missing.
- [ ] **CORS Domain Whitelisting**: Confirm `CORS_ORIGIN` on Render is locked to `https://yencare-platform.vercel.app` and Vercel preview hosts.
- [ ] **Local Demonstration Fallback**: Pre-seed local Docker MongoDB replica set on the demonstration laptop to guarantee an instant offline fallback if venue Wi-Fi fails.

---

## 5. Final Demo & Presentation Preparation

### Presentation Structure (15 Minutes)
1. **The Campus Healthcare Challenge (2 mins)**: Overcrowded waiting rooms, lost academic hours, manual paper triage at KNUST Students' Clinic.
2. **The YɛnCare Solution (3 mins)**: Dual-facility outpatient booking, automated arrival windows, live corridor queue display, and doctor workstation isolation.
3. **Live Demonstration (6 mins)**:
   - *Patient Step*: Online booking in under 60 seconds with instant SMS confirmation.
   - *Reception Step*: Front-desk roster management, walk-in registration, and check-in to queue.
   - *Corridor Step*: Live display board announcement.
   - *Doctor Step*: Consultation room calling next patient and completing visit.
4. **Engineering Excellence & Security (2 mins)**: Fail-fast architecture, centralized RBAC matrix, student 2-booking cap, SMS OTP verification, and 391 automated tests.
5. **Impact & Future Roadmap (2 mins)**: 65% peak congestion reduction, student satisfaction metrics, and campus-wide rollout schedule.

### Hardware Staging Configuration
- **Station 1 (Mobile Device)**: Patient booking and self-service arrival check-in.
- **Station 2 (Laptop 1)**: Front Receptionist workstation (`/staff`).
- **Station 3 (Laptop 2)**: Doctor Room 1 workstation (`/doctor`).
- **Station 4 (External Display / Projector)**: Corridor Digital Board (`/queue`).

---

## 6. Definition of Done (DoD) Checklist

To officially declare the YɛnCare Capstone project completed, the team must sign off on the following checklist:

### Functional & Clinical Logic
- [x] Students can book consultations for KNUST Students' Clinic and KNUST Hospital.
- [x] Maximum 2 active appointments enforced per student index with HTTP 409 Conflict.
- [x] Same-day double-booking prevented via atomic time slot claim and unique partial index.
- [x] Slots earlier today that have passed cannot be booked.
- [x] Arrival check-in enforced within 60 minutes early to 15 minutes late.
- [x] Unattended bookings marked as no-show automatically free time slots and reset room queue markers.
- [x] Self-service appointment cancellation and rescheduling protected by 4-digit SMS OTP.
- [x] Doctor workstations strictly isolate patient queues to the attending clinician.

### Security, DevOps & Quality
- [x] Fail-fast startup configuration validator operational (`config/env.js`).
- [x] Centralized Role-Based Access Control matrix operational (`hasPermission`).
- [x] Multi-tier rate limiting active on public arrival and lookup endpoints.
- [x] 405 backend unit/integration tests passing (100% pass rate across 98 suites).
- [x] Playwright cross-browser end-to-end suite passing in CI.
- [x] Frontend production bundle builds cleanly.
- [ ] Frontend ESLint clean (0 errors, 0 warnings).
- [x] Defense-in-depth NoSQL recursive operator sanitization middleware mounted (`nosqlSanitizer` in `security.js`, `app.js`).
- [ ] Staging API reachable with verified Atlas database connection.

### Presentation & Handover
- [ ] 15-minute presentation slide deck completed and rehearsed.
- [ ] 3-minute high-definition demo fallback video recorded.
- [ ] Complete documentation runbooks updated in `docs/`.
- [ ] Git repository tagged `v1.0.0` with clean installation instructions.
- [ ] Final project defense delivered to AmaliTech evaluators.
