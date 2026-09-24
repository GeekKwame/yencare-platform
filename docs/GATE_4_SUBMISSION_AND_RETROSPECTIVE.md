# Gate 4 Milestone Submission & Project Retrospective

**Project Title**: YɛnCare — Outpatient Clinic Appointment Booking & Live Virtual Queue Platform  
**Target Institutions**: KNUST University Health Services (Students' Clinic & KNUST Hospital)  
**Milestone**: Gate 4 (Week 4 — Hardening, Clinical Business Logic & Production Readiness)  
**Submission Date**: Friday, 25 September 2026  
**Team Lead**: Blessing Edmund Kwame Dogbe  
**Team Members**: Able Kafu Azanda, Sterling Awuley, Raymond Badu Afrani, Harry “Ephraim” Nartey  
**Evaluator Body**: AmaliTech Training Academy & Evaluation Board  

---

## 1. Executive Summary & Gate 4 Scope

During Week 4, the engineering team executed the **Hardening & Business Logic** milestone, transitioning YɛnCare from functional prototypes into a production-grade, secure, and audited clinical management platform.

### Core Objectives Achieved
1. **Clinical Policy Enforcement**: Implemented the active student booking cap (max 2 active bookings per student index) and same-day double-booking prevention.
2. **Security & Anti-Abuse Hardening**: Closed cancellation/reschedule auth bypass vulnerabilities (PR #25), enforced server-derived audit trails, and applied per-IP rate limiting against arrival brute-forcing.
3. **DevOps & Fail-Fast Reliability**: Authored the startup configuration validator (`config/env.js`) and centralized Role-Based Access Control (`hasPermission`).
4. **Hermetic End-to-End Automation**: Expanded Playwright coverage across reception workflows, visit-day boundaries, and late-grace slot release.
5. **Live Staging Deployment**: Continuous deployment on **Vercel** (`https://yencare-platform.vercel.app`) backed by **Render** (`https://yencare-api-staging.onrender.com`) and **MongoDB Atlas**.

---

## 2. Gate 4 Deliverables Checklist

| Requirement | Status | Verification & Artifact |
|---|---|---|
| **Student Booking Cap (Issue B)** | ✅ Completed | Max 2 active bookings per student (`BOOKED`, `CHECKED_IN`, `WAITING`); rejects 3rd booking with 409 Conflict. Covered in `test/studentBookingCap.test.js`. |
| **Double-Booking Guard** | ✅ Completed | Rejects multiple bookings on the same calendar date for the same student index. |
| **Auth Bypass Fix (PR #25)** | ✅ Completed | `resolveActingUser` rejects forged/unverified tokens; actor identity is server-derived only. Covered in `test/appointmentOwnership.test.js`. |
| **Visit-Day & No-Show Guards (PR #24)** | ✅ Completed | 21 Playwright E2E tests validating arrival window (60m early / 15m late) and no-show slot freeing. |
| **Staff Action Tooltips (PR #26)** | ✅ Completed | Clear hover tooltips on Check In & No-Show buttons with full preservation of accessibility and button interactivity. |
| **Startup Environment Validator** | ✅ Completed | `backend/src/config/env.js` halts boot with formatted diagnostic ASCII banner if critical configs are missing. |
| **Centralized RBAC Matrix** | ✅ Completed | `hasPermission(user, 'APPOINTMENTS_CHECKIN')` in `staffAuth.js` with matrix tests in `test/rbac.test.js`. |
| **Live Testing Guide & PDF** | ✅ Completed | Comprehensive testing runbook (`docs/testing/LIVE_TESTING_GUIDE.md`) and branded PDF generator. |

---

## 3. System Architecture & Quality Verification

### 3.1 Test Automation Metrics
- **Backend Unit & Integration Suite**: **339 tests passing** across **84 suites** (`npm test` in `backend/`).
  - `configEnv.test.js`: 12 tests
  - `rbac.test.js`: 8 tests
  - `studentBookingCap.test.js`: 6 tests
  - `appointmentOwnership.test.js`: 14 tests
  - `rateLimit.test.js`: 7 tests
  - `visitDayGuard.test.js`: 24 tests
  - `queueEngine.test.js`: 18 tests
- **End-to-End Browser Automation**: **21 tests passing** via Playwright (`npm run test:e2e`).
- **Client Builds**: 100% clean production Vite builds across both `frontend/` and `ui/prototype/`.

### 3.2 Live Environment URLs
- **Web Application**: [https://yencare-platform.vercel.app](https://yencare-platform.vercel.app)
- **Backend API**: [https://yencare-api-staging.onrender.com](https://yencare-api-staging.onrender.com)
- **Health Check**: [https://yencare-api-staging.onrender.com/health](https://yencare-api-staging.onrender.com/health)

---

## 4. Week 4 Project Retrospective

### 4.1 What Went Well (Successes)
- **High-Velocity Peer Reviews**: The team conducted swift, high-standard code reviews on PRs #24, #25, and #26, catching regression issues and accessibility oversights before merging.
- **Fail-Fast Architecture**: Introducing `config/env.js` eliminated confusing runtime crashes caused by missing host secrets on Render/Atlas.
- **Robust Security Posture**: Eliminating reliance on unverified JWT decoding closed critical authorization bypasses, ensuring audit logs remain immutable and authentic.
- **Comprehensive Documentation**: Complete documentation alignment across API reference, database runbooks, and live testing guides.

### 4.2 Challenges Encountered & Resolutions
- **Cross-Platform Test Execution**: Windows process handling occasionally reused hanging Vite dev servers during E2E runs. Resolved by adding hermetic server spawning in `playwright.config.js`.
- **Button Accessibility & E2E Conflicts**: An early attempt at tooltips disabled buttons and overrode `aria-label`, breaking Playwright selectors. Resolved by moving contextual status into native `title` attributes and retaining button interactivity.
- **Accra Timezone Normalization**: Time calculations for arrival windows and no-show boundaries required strict GMT rollover handling, which was standardized in `lib/accraTime.js`.

### 4.3 Key Learnings & Preparation for Gate 5 Defence
1. **Contract-First Development**: Clear schema definitions and shared types between frontend and backend prevent integration mismatches.
2. **Role-Based Security**: Ad-hoc role checks in route handlers quickly become unmaintainable; the centralized `hasPermission()` RBAC pattern provides cleaner auditing and scaling.
3. **Live User Testing Readiness**: With full test coverage and live staging environments established, the team is fully prepared for tomorrow's live clinic simulation and Gate 5 final defence.
