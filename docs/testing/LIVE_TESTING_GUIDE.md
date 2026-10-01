# YenCare Live Clinical Testing Guide & Team Playbook

> **Target Date:** Live Testing Session  
> **Platform Version:** YenCare v1.0.0 (Week 4 Quality & Hardening Milestone)  
> **Audience:** Development, QA, Product, and Clinical Workflow Testers  

---

## 📋 1. Purpose & Objectives

This playbook guides team members through end-to-end testing of the live YenCare platform. The goal is to simulate realistic clinical day operations across the student-facing portal, reception desk, and doctor consultation rooms.

By following this guide, we will verify:
1. Online appointment booking, validation, and real-time slot locking.
2. Self-service patient workflows: appointment lookup, SMS OTP verification, rescheduling, and cancellation.
3. Live queue progression: patient arrival, corridor queue tokens, and wait-time estimations.
4. Staff reception desk operations: roster views, fast-track walk-ins, and desk check-in.
5. Doctor workstation controls: clinician room isolation, calling the next patient, and completing consultations.
6. Guardrails and business rules: student 2-booking cap, double-booking prevention, clinic operating hours, and offline recovery.

---

## 🔑 2. Environment & Access Credentials

### 🌐 Live Hosted Deployment (Vercel)
* **Live Patient Web App:** [https://yencare-platform.vercel.app/](https://yencare-platform.vercel.app/)
* **Live Staff Portal Login:** [https://yencare-platform.vercel.app/staff/login](https://yencare-platform.vercel.app/staff/login)
* **Live Corridor Queue Display:** [https://yencare-platform.vercel.app/queue](https://yencare-platform.vercel.app/queue)

### 💻 Local Development Fallback
* **Local Patient Web App:** `http://localhost:5173`
* **Local Staff Portal Login:** `http://localhost:5173/staff/login`
* **Local Corridor Queue Display:** `http://localhost:5173/queue`
* **Backend REST API:** `http://localhost:4000/api`

### Demo Staff Accounts
All demo staff accounts use the default password: **`yencare`**

| Role | Staff Member | Email / Staff ID | Default Location | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Receptionist** | Abena Osei | `abena.osei@yencare.gh` / `stf_01` | Front Reception Desk | Roster lookup, desk check-in, student ID verification, walk-in triage |
| **Medical Doctor 1** | Dr. Kwame Boateng | `kwame.boateng@yencare.gh` / `stf_02` | **Room 1** *(Clinic)* / **OPD Room 1** *(Hospital)* | Senior Medical Officer consultations, calling next patient, completing visits |
| **Medical Doctor 2** | Dr. Ama Serwaa | `ama.serwaa@yencare.gh` / `stf_04` | **Room 2** *(Clinic)* / **OPD Room 2** *(Hospital)* | Medical Officer consultations, calling next patient, completing visits |
| **Administrator** | Kojo Mensah | `kojo.mensah@yencare.gh` / `stf_03` | Operations Office | System oversight, emergency overrides, roster configuration |

---

## 🚀 3. Step-by-Step Testing Journeys

We recommend testers split roles: one person acting as the **Student Patient**, another as **Reception Desk**, and another as the **Attending Doctor**.

```
[Student Mobile/Web]               [Reception Desk]                [Doctor Workstation]
       │                                  │                                  │
       ├─ 1. Book Slot                    │                                  │
       │  (YC-XXXX reference issued)      │                                  │
       │                                  │                                  │
       ├─ 2. Arrive at Clinic             │                                  │
       │  (or Desk Walk-In) ─────────────►├─ 3. Check-In & Queue             │
       │                                  │  (Assigned Room Token)           │
       │                                  │                                  │
       │◄── 4. Corridor Board Updates ────┴──────────────────────────────────┤
       │    (Token displayed on screen)                                      │
       │                                                                     ├─ 5. Call Next
       │◄── 6. Enters Room ──────────────────────────────────────────────────┤
       │                                                                     │
       │                                                                     ├─ 7. Complete Visit
       ▼                                                                     ▼
```

---

### Journey 1: Patient Online Booking Flow (P01–P06)

1. **Open the Patient Web App** at `http://localhost:5173`.
2. Notice the clinic open/closed indicator in the top hero (calculated using Ghana/Accra local time).
3. Click **"Book Consultation"** (or use the navigation bar).
4. **Step 1 — Clinic Site:** Choose **KNUST Students' Clinic** (Monday–Friday, 08:00–16:00).
5. **Step 2 — Personal Details:**
   - Full Name: `Akosua Mensah`
   - Phone Number: Enter a valid Ghana phone (e.g. `024 123 4567` or `+233241234567`).
   - Student Index: Enter an 8-digit student index (e.g. `20612345`).
   - NHIS Number: Optional.
6. **Step 3 — Service Type:** Select **General OPD**.
7. **Step 4 — Clinician Selection:** Choose **Dr. Kwame Boateng (Room 1)** or **Dr. Ama Serwaa (Room 2)**.
8. **Step 5 — Select Date:** Choose an upcoming weekday date (e.g. tomorrow or any weekday in the next 14 days).
9. **Step 6 — Select Time Slot:** Pick an open consultation slot (e.g., `09:30`).
10. **Step 7 — Review & Confirm:**
    - Verify all summary details (service, doctor, room, date, arrival instructions).
    - Click **"Confirm booking"**.
11. **Verification Points:**
    - Confirmation screen displays the unique **Booking Reference** (format: `YC-XXXX`).
    - If configured with live SMS (`mNotify`), an SMS confirmation is delivered to the phone; otherwise, verify the terminal logs show outbound SMS dispatch.
    - The reference code is automatically saved in your browser session for quick retrieval.

---

### Journey 2: Patient Self-Service Management (P09–P17)

#### 2A. Appointment Lookup
1. In the navigation bar, go to **"Appointments"** $\rightarrow$ **"Find Existing Appointment"**.
2. Search using your **Reference Code (`YC-XXXX`)**.
3. Verify that the booking card opens with full appointment details.
4. Try searching using your **Student Index (`20612345`)** and verify the active visit is returned.

#### 2B. Reschedule with SMS OTP
1. On the appointment card, click **"Reschedule Appointment"**.
2. Click **"Send Verification Code"**.
3. Check the SMS on your device (or check server terminal logs for `[OTP] Generated 4-digit code`).
4. Enter the 4-digit OTP code and click **"Verify & Continue"**.
5. Choose a new date and a new available time slot.
6. Submit the change.
7. **Verification Points:**
   - The reference code remains identical.
   - The date and time update to the new values.
   - The previous slot is released back to the catalog for other students.
   - An audit log entry is recorded in the backend.

#### 2C. Cancellation Flow
1. On another test appointment, click **"Cancel Appointment"**.
2. Enter the OTP verification code and select a cancellation reason (e.g. *"Resolved symptoms"* or *"Class schedule conflict"*).
3. Confirm cancellation.
4. **Verification Points:**
   - The status transitions to `CANCELLED`.
   - The time slot is unlocked immediately.

---

### Journey 3: Arrival & Live Queue Check-In (S01–S03)

1. On the day of the appointment, the patient opens their booking card on mobile or web.
2. Click **"I Have Arrived"**. *(Note: Arrival check-in is permitted starting 60 minutes before the scheduled slot up to 15 minutes after).*
3. **Verification Points:**
   - Appointment status transitions from `BOOKED` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `WAITING`.
   - A sequential room-prefixed queue token is generated (e.g., `#A1` for Room 1, `#B1` for Room 2).
   - Estimated wait time is computed and displayed based on average consultation durations.
4. Open the **Corridor Live Board** (`/queue`):
   - Verify the patient's token appears under the waiting list.

---

### Journey 4: Reception Desk Operations (Staff Portal)

1. Navigate to `/staff/login` and sign in with:
   - **Email:** `abena.osei@yencare.gh`
   - **Password:** `yencare`
2. **Review the Appointments Roster:**
   - Navigate to the **Appointments Roster** view.
   - Filter by status using the filter pills: `All`, `Booked`, `Checked-In`, `Waiting`, `Walk-In`.
   - Toggle between **Today** and **Seed day (2026-09-15)** to inspect test datasets.
3. **Desk Check-In:**
   - Find a patient who has arrived at the reception desk in person.
   - Click **"Check In"** $\rightarrow$ **"Send to Queue"**.
   - Verify the patient is issued their queue token without needing self-service mobile access.
4. **Fast-Track Walk-In Intake:**
   - Click **"+ Add Walk-In"**.
   - Enter walk-in student details (Name, Ghana phone, optional Student Index).
   - Select the attending clinician.
   - Submit the walk-in.
   - **Verification Points:**
     - A slot is atomically claimed or generated for the walk-in.
     - The walk-in is immediately checked in and placed into the queue.

---

### Journey 5: Doctor Workstation & Consultation (S04–S07)

1. Open an Incognito window (or second browser) and go to `/staff/login`.
2. Sign in as **Dr. Kwame Boateng** (`kwame.boateng@yencare.gh` / `yencare`).
3. Notice that the workstation defaults to **Room 1**.
4. **Verify Clinician Isolation (Security & Clinical Guard):**
   - Dr. Kwame should **only** see patients booked with him in Room 1.
   - Dr. Kwame should **never** see or call Dr. Ama's patients booked for Room 2.
5. **Call Next Patient:**
   - Click **"Call Next Patient"**.
   - The top waiting ticket transitions to `CALLED`.
   - The Corridor Board updates: announces the token and directs the patient to **Room 1**.
   - **Patient Notification:** Patient receives live SMS: *"It is your turn now! Token A-XX is now called to Room 1. Booking ID: YC-XXXX. Please proceed inside immediately."*
6. **Complete Consultation:**
   - After consultation, click **"Complete Visit"**.
   - The status updates to `COMPLETED` and the room resets for the next patient.
   - **Visit Completed Notification:** Patient receives hospital discharge SMS: *"Visit completed. Your consultation with Dr. Kwame Boateng at KNUST Students' Clinic is complete. Please proceed to the pharmacy for prescribed medications or laboratory for tests. Booking ID: YC-XXXX."*
7. Repeat the test logging in as **Dr. Ama Serwaa** (`ama.serwaa@yencare.gh` / `yencare`) to verify Room 2 queue isolation.

---

## 🛡️ 4. Policy Guardrails & Edge Cases to Stress-Test

Please make sure to run these intentional test cases to verify our error handling and security guards:

| Test Case | Procedure | Expected Behavior |
| :--- | :--- | :--- |
| **Student Booking Cap (Max 2)** | Try booking **3 active upcoming appointments** using the same Student Index (`20612345`). | The 3rd attempt is rejected with **HTTP 409**: *"You have reached the maximum of 2 active appointments. Please complete or cancel existing visits."* |
| **Concurrent Double-Booking** | Have two testers open the exact same doctor and time slot, then click **"Confirm booking"** at the exact same second. | Exactly one tester receives `201 Created` with a confirmed reference. The second tester receives `409 Conflict` and is guided to pick another open slot. |
| **Operating Hours Guard** | Attempt to book a slot on a Saturday/Sunday at KNUST Students' Clinic, or outside 08:00–16:00. | Blocked both in the UI calendar and validated by the backend with opening hours notice. |
| **Arrival Window Enforcement** | Attempt to check in more than 60 minutes before the scheduled time slot, or >15 minutes late. | Early arrival informs the patient to wait. Late arrival flags the appointment and directs them to speak to reception. |
| **Wrong OTP Code** | In cancel/reschedule, enter an incorrect 4-digit code (e.g. `0000`). | Blocked with: *"Invalid or expired verification code"*. |
| **Offline Roster Display** | In Chrome DevTools $\rightarrow$ Network tab, set throttling to **Offline** while viewing the Staff Roster. | Displays: *"Could not load appointment roster. [Retry]"* with a working Retry button instead of an empty list. |

---

## 🐛 5. How to Report Findings

If you discover a bug, visual inconsistency, or confusing user experience during testing, please submit a report with:

1. **Area / Screen:** (e.g., *Doctor Workstation $\rightarrow$ Room Selection*)
2. **Steps to Reproduce:** Exact inputs, clicks, and roles tested.
3. **Expected Behavior:** What should have happened clinically or technically.
4. **Actual Behavior:** What happened instead (include console errors, network response, or screenshots).
5. **Environment Details:** Browser (Chrome/Firefox/Safari) and device type (Desktop/Mobile).

---

*Thank you for helping ensure YenCare delivers a seamless, reliable experience for students, receptionists, and clinicians!*
