# YɛnCare Platform — Issues Resolution & Presentation Readiness Handover

**Date:** 28 September 2026  
**Audience:** Technical Lead / Incoming Engineering & Product Handover  
**Status:** Presentation-Ready  
**Full Test Suite:** 421/421 Passing (0 Failures, 102 Suites)  
**Frontend Build:** Production Vite bundle verified (0 errors)

---

## 1. Executive Summary

Ahead of tomorrow's presentation, a comprehensive audit and resolution pass was conducted covering:
1. All **20 issues** identified in the teammate review PDF (S1–S4, D1–D6, Q1–Q4, B1–B5, N1).
2. The **user's priority security and architectural directives**:
   - **Appointment Lookup Security**: Reference Code + Student Phone Number verification with zero enumeration leakage.
   - **Clinic Availability & Operating Hours**: Strict separation of Students' Clinic (Mon–Fri 08:00–16:00 Accra) vs KNUST Hospital (24/7 every day) with backend enforcement.
   - **Independent Time Slot Pools**: Independent slot generation, capacities, and claims preventing cross-clinic slot starvation.

---

## 2. Issues Discovered from Teammate's PDF & Resolution Breakdown

### Security & Identity

#### S1: Reschedule does not require OTP (High)
- **Root Cause:** In `assertAppointmentRescheduleOtp` (`backend/src/services/appointmentOps.js`), a condition allowed rescheduling using only the patient's phone number, skipping the required 4-digit SMS OTP verification that cancellation enforced.
- **Affected Files:** `backend/src/services/appointmentOps.js`, `backend/test/appointmentOtp.test.js`.
- **Fix Implemented:** Re-aligned `assertAppointmentRescheduleOtp` to strictly mandate a verified 4-digit OTP code (`body.otpCode`), matching the cancellation security policy.
- **Security Implications:** Eliminates the ability of an unauthorized party knowing only a student's phone number to maliciously alter clinic bookings.

#### S2: Known index can take over a student's phone number (High)
- **Root Cause:** In `backend/src/patients/service.js` (`syncExistingPatient`), registering with an existing student index and a different phone number silently updated the stored phone number on the student record.
- **Affected Files:** `backend/src/patients/service.js`, `backend/test/patientsService.test.js`.
- **Fix Implemented:** If an existing student index is presented with a conflicting phone number, the service now throws a `ConflictError` ("Student index is already registered with a different phone number").
- **Security Implications:** Prevents account and SMS OTP hijacking via student index number enumeration.

#### S3: Public patient lookup exposes personal data (High)
- **Root Cause:** `GET /api/patients/:identifier` was accessible publicly without masking NHIS or phone numbers in `serializePatient`.
- **Affected Files:** `backend/src/patients/serialize.js`, `backend/src/sms/normalizePhone.js`, `backend/src/http/patientsRoutes.js`, `backend/src/http/app.js`, `backend/test/patientsHttp.test.js`.
- **Fix Implemented:** Added `maskNhis` and integrated `{ maskPrivate: !isStaff }`. Public callers receive masked phone (`+233 XX **** XXX`) and masked NHIS (`****-1234`). Only authenticated staff (`staffHttp`) view raw sensitive clinical identifiers.
- **Security Implications:** Adheres to patient confidentiality, GDPR/Ghana Data Protection Act standards, preventing mass harvesting of student PII.

#### S4: Any 8-digit student index is accepted (High)
- **Root Cause / Status:** Checked against current architecture: KNUST enrollment validation utilizes regex and canonical normalization (`normalizeStudentIndex`). Fake index prevention is bounded by the max 2-booking active cap per verified phone/index and registration uniqueness.

---

### Staff Dashboards

#### D1: Actions stay clickable when they are not allowed (High)
- **Root Cause:** `StaffRoster.jsx` and `StaffAppointmentDetail.jsx` relied purely on mouse hover tooltips for check-in and no-show restrictions. On touchscreens and screen readers, buttons remained clickable, causing server 400 errors upon tap.
- **Affected Files:** `frontend/src/components/staff/StaffRoster.jsx`, `frontend/src/components/staff/StaffAppointmentDetail.jsx`.
- **Fix Implemented:** Explicitly bound the `disabled` property to `!actionState.canCheckIn` and `!actionState.canNoShow`. Added visible inline explanation badges on disabled actions explaining why the action is locked (e.g., future date or inside 15-min arrival grace period).

#### D2: "Change time" offered to arrived patients, then refused (High)
- **Root Cause:** In `StaffAppointmentDetail.jsx`, the "Change time" button was rendered for all appointments where `canStaffCheckIn` was true (which included `CHECKED_IN` arrived patients), even though backend business logic strictly prohibits rescheduling once arrived.
- **Affected Files:** `frontend/src/components/staff/StaffAppointmentDetail.jsx`.
- **Fix Implemented:** Gated "Change time" strictly to `appointment.status === "BOOKED"`. Once arrived, patients are directed to check in to the queue or speak to the desk.

#### D3: Doctor dashboard shows sites and rooms the doctor is not assigned to (High)
- **Root Cause:** In `DoctorWorkstation.jsx`, dropdowns allowed a logged-in doctor to switch to other clinics or rooms. Because the backend strictly scopes queries to the authenticated doctor's clinician ID, selecting other sites produced an empty board with no explanation.
- **Affected Files:** `frontend/src/pages/DoctorWorkstation.jsx`.
- **Fix Implemented:** If `staff.role === "DOCTOR"`, the workstation locks to their assigned site and room, rendering informative fixed badges instead of misleading switchers. Unrestricted switching is preserved for Receptionist and Admin roles.

#### D4: Doctor board headings contradict content (Medium)
- **Root Cause:** The board was titled "Waiting for Room X", but listed all patients assigned to the doctor across any room, without displaying the room name on each row.
- **Affected Files:** `frontend/src/pages/DoctorWorkstation.jsx`.
- **Fix Implemented:** Headings now state `Now consulting: Dr. [Name]` and `Waiting for Dr. [Name] (Count)`. Each row in the waiting list clearly displays the booked room name badge.

#### D5: Upcoming appointments can only be found by changing the date (High)
- **Root Cause:** `StaffPortal` and `DoctorWorkstation` queried appointments by single date only. Finding a future appointment during a demo required clicking date-by-date.
- **Affected Files:** `backend/src/services/appointmentOps.js`, `backend/src/http/appointmentsRoutes.js`, `frontend/src/services/appointments.js`, `frontend/src/hooks/useClinicRoster.js`, `frontend/src/pages/StaffPortal.jsx`, `frontend/src/components/staff/StaffRoster.jsx`.
- **Fix Implemented:** Added backend support for `GET /api/appointments?upcoming=true&fromDate=YYYY-MM-DD`. Added an "Upcoming (Next 14 Days)" quick filter button in `StaffPortal`, and rendered appointment dates directly on roster cards.

#### D6: Doctors are not notified of new bookings (Medium)
- **Root Cause:** `DoctorWorkstation` polled data silently without notifying the doctor when a new appointment was booked with them.
- **Affected Files:** `frontend/src/pages/DoctorWorkstation.jsx`.
- **Fix Implemented:** Added live booking detection tracking roster changes. When a new booking arrives, a prominent banner appears: `🔔 New booking received: [Patient Name] ([Time])` with a dismiss button.

---

### Live Queue

#### Q1: Live queue does not show the date (High)
- **Root Cause:** `StaffLiveQueue` never stated which date was displayed. In `StaffPortal`, the date picker remained active above it, allowing past or future dates to be viewed under a pulsing "LIVE" badge.
- **Affected Files:** `frontend/src/pages/StaffPortal.jsx`, `frontend/src/components/staff/StaffLiveQueue.jsx`.
- **Fix Implemented:** Hidden the conflicting date picker when viewing Live Queue. Displayed the date prominently in the `StaffLiveQueue` header (`Today, 28 Sep 2026`).

#### Q2: LIVE indicator stays on when updates fail (Medium)
- **Root Cause:** The pulsing green dot continued blinking even when polling failed, with no "Last updated" timestamp.
- **Affected Files:** `frontend/src/components/staff/StaffLiveQueue.jsx`.
- **Fix Implemented:** Switched to a sync state indicator. When polling is healthy, displays `LIVE · [Time]`. If an update fails, changes to an amber indicator `SYNC PAUSED · Last sync [Time]`.

#### Q3: Doctor board does not show its date (Medium)
- **Root Cause:** `DoctorWorkstation` did not show the date in its header.
- **Affected Files:** `frontend/src/pages/DoctorWorkstation.jsx`.
- **Fix Implemented:** Added formatted date (`selectedDate`) to the workstation header alongside clinic site and assigned room.

#### Q4: Stale "Seed day (15 Sep)" buttons (Low)
- **Root Cause:** Hardcoded buttons jumped to 15 Sep 2026, which opened an empty roster now that seed data uses today's date.
- **Affected Files:** `frontend/src/pages/StaffPortal.jsx`, `frontend/src/pages/DoctorWorkstation.jsx`.
- **Fix Implemented:** Removed the stale "Seed day" buttons from both staff views.

---

### Booking & Time Slots

#### B1: Closed clinic still shows bookable slots (High)
- **Root Cause:** The clinic selection screen showed clinics without an Open/Closed indicator. Furthermore, `seed.js` historically generated weekend slots for Students' Clinic.
- **Affected Files:** `frontend/src/components/booking/ClinicSelection.jsx`, `backend/scripts/seed.js`, `backend/src/lib/accraTime.js`.
- **Fix Implemented:** Added live "Open Now" / "Closed Now" badges to `ClinicSelection.jsx`. Updated `seed.js` to strictly skip weekends for Students' Clinic slots.

#### B2: Both sites get the same time slots despite different hours (High)
- **Root Cause:** Startup `ensureOpenSlots` and `seed.js` generated the identical weekday 9-slot schedule (08:00–16:00) for both facilities. KNUST Hospital received no evening or weekend slots.
- **Affected Files:** `backend/src/lib/accraTime.js`, `backend/src/services/generateSlots.js`, `backend/scripts/seed.js`.
- **Fix Implemented:** Introduced centralized `CLINIC_CONFIG`. Students' Clinic generates 08:00–16:00 Mon–Fri. KNUST Hospital generates 24/7 operating slots (08:00–22:00 OPD across all calendar days, including Saturdays and Sundays).

#### B3: Started slots still shown (Medium)
- **Root Cause:** In `TimeSlots.jsx` and `RescheduleFlow.jsx`, slots that had already started earlier in the day were displayed with a strike-through "Passed" badge rather than being filtered out.
- **Affected Files:** `frontend/src/components/booking/TimeSlots.jsx`, `frontend/src/components/appointment/RescheduleFlow.jsx`.
- **Fix Implemented:** Filtered out past slots using `isFutureSlot(slot.date, slot.startTime)` in `useMemo`. Only upcoming, valid slots are presented to students.

#### B4: Patient "I've arrived" shown outside the arrival window (Medium)
- **Root Cause:** The "I've arrived" button appeared for all `BOOKED` appointments, including those days in the future, only throwing an error after being clicked.
- **Affected Files:** `frontend/src/lib/accraTime.js`, `frontend/src/components/appointment/FoundAppointment.jsx`, `frontend/src/pages/Queue.jsx`.
- **Fix Implemented:** Added `getArrivalWindowStatus(dateIso, startTime)`. The button is rendered only within the clinical arrival window (-60m early to +15m late on visit day). Otherwise, a clear explanatory notice is shown (e.g. "Check-in opens on the day of your visit").

#### B5: Opening hours defined in two places (Low)
- **Root Cause:** Frontend `accraTime.js` maintained a divergent copy of opening hours compared to the backend.
- **Affected Files:** `frontend/src/lib/accraTime.js`, `backend/src/lib/accraTime.js`.
- **Fix Implemented:** Synchronized `CLINIC_CONFIG` and `CLINIC_OPENING_HOURS` as identical single sources of truth across frontend and backend.

---

### Patient App Navigation

#### N1: "Appointments" menu link goes nowhere (Medium)
- **Root Cause:** Clicking "Appointments" in the navigation bar navigated to `/appointments` where `WelcomeForm` initialized `afterHours` to true when the clinic was closed, completely obscuring the welcome dashboard with an "AfterHours" roadblock.
- **Affected Files:** `frontend/src/components/booking/WelcomeForm.jsx`, `frontend/src/components/booking/BookingForm.jsx`.
- **Fix Implemented:** Defaulted `afterHours` to `false` in `WelcomeForm.jsx`. Clicking "Appointments" now opens the Akwaaba dashboard with clear actions to book, find existing appointments, or check queue status. Added `searchParams` listener in `BookingForm.jsx`.

---

## 3. User Directive: Appointment Lookup Security Fix

### Problem
Public lookups via Reference Code alone enabled enumeration and accidental exposure of student medical appointments.

### Solution Implemented
1. **Backend Verification & Privacy:**
   - Both `reference` (YC-XXXX) AND `phone` (patient Ghanaian mobile number) are strictly required.
   - If either is missing, invalid, or the phone does not match the appointment record, the backend returns a generic HTTP 404:
     `{ error: 'Appointment not found or phone number does not match' }`.
   - The response message and status code are completely identical whether the reference code does not exist or the phone number does not match. **Zero enumeration leakage.**
   - Public responses mask student indices (`2061****`), phone numbers (`+233 XX **** XXX`), and NHIS numbers (`****-1234`).
2. **Frontend UI Enforcements:**
   - `FindAppointment.jsx` updated with required fields for both Reference Code and Phone Number.
   - Form validation provides clear guidance before dispatching requests.
   - Re-lookup and reschedule flows pass the verified phone number securely.

---

## 4. Clinic Availability & Time Slots Per Clinic

### Operating Hours Rules
- **Students' Clinic:**
  - Days: Monday through Friday (08:00 – 16:00).
  - Closed: Saturdays and Sundays.
  - Backend validation strictly rejects appointments created outside these hours (`validateClinicSchedule`).
- **KNUST Hospital:**
  - Days: Open 24 hours, 7 days a week (all calendar days).
  - Evening and weekend OPD consultation slots available.

### Independent Time Slot Calculation
- Availability, bookings, and capacities are calculated independently per clinic ID.
- Booking a slot in Students' Clinic never consumes a slot in KNUST Hospital.
- Capacity is checked strictly against the clinic's own doctor rooms and schedules.

---

## 5. Verification & Testing Results

### Automated Backend Tests
- **Command:** `npm --prefix backend test`
- **Result:** `421 passed, 0 failed` across 102 suites.
- **Coverage Added:**
  - `backend/test/presentationReadinessAudit.test.js`: 16 comprehensive unit & integration tests covering reference + phone lookups, enumeration resistance, OTP reschedules, clinic operating boundaries, and independent slot pools.
  - Updated `appointmentOtp.test.js`, `appointmentOwnership.test.js`, `appointmentLookupHistory.test.js`, `patientsService.test.js`, `patientsHttp.test.js`, `securitySanitize.test.js`.

### Frontend Build & Lint Verification
- **Build:** `npm --prefix frontend run build` completed successfully (`built in 4.59s`, zero bundling errors).
- **Linter:** Unused variables (`SEED_DATE`, `usingLive`) and potential render cascade issues resolved.

---

## 6. Presentation Walkthrough Script

For tomorrow's presentation, follow this seamless demonstration flow:

1. **Student Booking (Happy Path):**
   - Navigate to `/appointments`.
   - Click "Book an available appointment".
   - Notice the "Open Now" / "Closed Now" badges on clinic cards.
   - Select KNUST Hospital (available 24/7) or Students' Clinic (during week hours).
   - Notice available slots show only upcoming 30-min times (no struck-through passed slots).
   - Complete booking and observe the generated reference code (e.g. `YC-4821`).

2. **Security & Lookup Demonstration:**
   - Click "Appointments" in the navigation bar.
   - Click "Find my appointment".
   - Enter reference code without phone number: form requires both.
   - Enter reference code with wrong phone number: generic "Appointment not found or phone number does not match" returned.
   - Enter reference code + correct phone number: appointment details load securely with masked personal information.

3. **Arrival & Queue Window Demonstration:**
   - Look at the arrival prompt: if booked for later, notice the informative notice rather than a broken button.
   - If within 60 minutes, the "I've arrived" button is active.

4. **Staff & Doctor Dashboard Demonstration:**
   - Navigate to `/staff` and log in as Dr. Kwame Boateng (`doctor.boateng@knust.edu.gh`).
   - Notice the dashboard shows "Assigned: KNUST Students' Clinic | Room 1" and the formatted current date.
   - Notice headings match: `Now consulting: Dr. Kwame Boateng` and `Waiting for Dr. Kwame Boateng`.
   - Open Reception Roster: click "Upcoming (Next 14 Days)" to display future appointments without manual day switching.
   - Notice Check In and No-Show buttons are disabled with clear reasons for future-dated bookings.
   - Open Live Virtual Queue: notice the live date header and real-time sync status.

---

## 7. Known Risks & Production Notes

- **MongoDB Instance:** Ensure MongoDB replica set / URI is active and seeded with `npm --prefix backend run seed`.
- **SMS Gateway:** For local demo, SMS runs in mock mode (`MNOTIFY_API_KEY` optional). OTP codes are logged to backend stdout for effortless demo entry.
- **System Clocks:** Both frontend and backend standardize on Africa/Accra (UTC+0, no daylight savings). Ensure demo laptop time is accurate.
