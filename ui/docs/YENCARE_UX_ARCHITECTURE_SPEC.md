# YɛnCare — UX Architecture & Product Design Specification

**Product:** YɛnCare  
**Tagline:** “Healthcare access, wherever you are.”  
**Programme:** AmaliTech Capstone Internship · Product 4 · Week 1  
**Document type:** UX architecture and product design specification (no visual UI)  
**Sources of truth:** `YenCare_Week1_Pitch.pdf` · `YenCare_Product4_ScopeSheet_Gate1.docx`  
**Audience:** UI/UX designer, Figma Agent, frontend (React), backend, product team  
**Stack constraint:** React web app · Node.js/Express · MongoDB · one SMS sandbox provider  

This document defines **what the product needs, how users move through it, what screens exist, what each screen contains, and how parts connect.** It does not specify colours, typefaces, illustrations, or high-fidelity layouts.

---

## How to read this document

- **MVP** is the only committed product scope for Gates 2–3 (feature freeze Friday 18 September 2026).
- **Stretch / future vision** must not appear as required screens or flows.
- Where the pitch is silent, items are labelled **Assumption** or **Open decision**.
- Screens or interactions needed for the MVP to function, but not named as product features, are labelled **Supporting UX requirement — not an additional product feature.**

### Product-scope tension (read this first)

The pitch *narrative* says a patient without a smartphone can book, get confirmed, and check their place in line through SMS, with USSD as stretch.

The pitch *commitment table* and Gate 1 scope sheet commit MVP SMS to **booking confirmation + one reminder only**. Booking, lookup, cancel, reschedule, and queue-position display are **web app** features. USSD is explicitly out of scope until after Gate 3.

**This specification follows the commitment table, not the narrative as if it were built.** SMS booking, SMS queue-check, and USSD are future/stretch. The web UX must still explain SMS confirmation and reminder clearly.

---

# 1. Product understanding

## The problem

Many patients in Ghana have limited access to smartphones, mobile data, or reliable internet. Even patients who can book online still lose hours sitting in a waiting room with no idea how long it will take. Clinic staff manage bookings, walk-ins, and queues largely by hand (paper logs or a sign-in sheet), so it is hard to see how many patients are actually waiting or to adjust when a doctor is unavailable.

The named community user is patients and reception/front-desk staff at **[partner clinic name, Ghana — not yet confirmed]**. Do not design as a generic multi-hospital marketplace.

## Target users

| User | Channel | Pitch basis |
| ---- | ------- | ----------- |
| Patient (smartphone / data) | Web app | Registration, booking, lookup, cancel, reschedule, queue position |
| Patient (feature phone / no data) | SMS in *vision*; **MVP SMS = confirmation + reminder only** | Scope sheet differentiator vs committed MVP |
| Receptionist / front-desk | Staff dashboard | Check-in, queue, appointment management |
| Doctor | Staff dashboard | Queue and appointment status (exact actions TBD) |
| Admin | Staff dashboard | Basic access control |

## Core solution

YɛnCare is a **clinic appointment and queue system**. Smartphone users book and manage appointments on a web app. Everyone who books receives SMS confirmation and one reminder. Staff run bookings, check-ins, and the live virtual queue from one dashboard.

## Main differentiator

**Low-connectivity access combined with a real virtual queue — not just a booking form.**

In the MVP, “low-connectivity access” means: a simple, resilient web booking experience plus SMS confirmation/reminder that runs on the cellular network. A full SMS or USSD booking channel is vision, not Gate 3 scope.

## MVP value proposition

A patient can book a clinic slot on the web, keep proof of the booking without staying online, and — once at the clinic — see their **place in a real queue** and a **rough wait estimate**. Staff stop running the day on paper.

## Primary user experiences

1. **Book** — register (patient record) + choose a slot + confirm + SMS.
2. **Find & manage** — look up an appointment, view details, reschedule, or cancel.
3. **Queue** — see position and rough wait after check-in.
4. **Staff operations** — today’s list, check-in, live queue, status changes.

## How web and SMS work together (MVP)

```
Patient books on the web (needs internet)
        ↓
Booking is saved in the database (source of truth)
        ↓
Web shows confirmation + appointment reference
        ↓
SMS confirmation is sent to the patient’s phone
        ↓
One SMS reminder is sent before the appointment
        ↓
Patient can return to the web (when they have data) to look up, change, or view queue
```

The web app is the **action channel**. SMS is the **proof and reminder channel**. If SMS fails or is delayed, the booking still exists. The web must say that clearly.

---

# 2. User personas

Personas are role-based. No unsupported demographics (age, income, specific region, family details) are invented.

## Persona 1 — Patient

**Who (from pitch):** A patient of the partner clinic in Ghana. May or may not have a smartphone or reliable data.

**Goals**
- Get a clinic appointment without travelling just to join a paper queue.
- Know the booking is real (reference + SMS).
- Change or cancel if plans change.
- Know where they stand in line and roughly how long they might wait.

**Needs**
- Few steps, plain language, large tap targets.
- A reference they can show at reception even if SMS never arrives.
- Clear next action at every stage (“arrive and check in”, “stay nearby”, “go in now”).

**Pain points**
- Hours lost in a waiting room with no information.
- Booking systems that assume always-on internet or complex accounts.
- Uncertainty about whether a booking “went through”.

**Technical comfort:** Mixed. Do not assume app literacy, email, or password managers.

**Connectivity:** Web actions need internet. SMS confirmation/reminder should not require the patient to stay on the page. Do not design offline web sync (stretch).

**What they must accomplish in YɛnCare**
- Give their details (registration).
- Book a slot.
- Receive / understand confirmation.
- Find the appointment later.
- Reschedule or cancel.
- Check queue position and rough wait (after they are in the queue).

**Information that matters most**
- Date and time.
- Appointment reference.
- Phone number used for SMS.
- Status (booked / checked in / waiting / called / completed).
- Queue position and that the wait is **rough, not exact**.
- What to do next.

## Persona 2 — Receptionist

**Who (from pitch):** Front-desk staff who currently run bookings, walk-ins, and the daily queue by hand.

**Goals**
- See who is coming today.
- Check arriving patients in quickly.
- Run a live queue instead of a paper list.
- Find a patient when they are at the desk.

**Responsibilities (inferred from pitch; not a job description)**
- Arrival handling and check-in.
- Queue visibility and status progression on the waiting/called path.
- Appointment lookup at the desk.

**Pain points**
- Paper logs; no shared picture of who is waiting; hard to adjust the day.

**Tasks in YɛnCare**
- Log in.
- Search today’s appointments.
- Check a patient in.
- Watch the live queue.
- Move queue status (exact permissions TBD).

**Information needed**
- Name, phone, appointment time, reference, doctor, status, queue position.

**Important actions**
- Search, check in, call / complete as permitted, open appointment details.

**Walk-ins:** The problem mentions walk-ins. Creating a same-day appointment then checking them in is **not a named MVP feature**. Treat as **Open decision**. If approved, it is appointment management — not a new product area.

## Persona 3 — Doctor

**Who (from pitch):** Clinic doctor; a first-class role with basic access control. Clinic will supply doctor/schedule/service data (scope-sheet assumption).

**Goals**
- Know who is next.
- Call a patient when ready.
- Mark the visit completed.

**Responsibilities (inferred)**
- Consultation flow at the end of the queue lifecycle (Called → Completed).

**Tasks in YɛnCare**
- View today’s list and/or live queue.
- Call patient / complete visit — **Permission decision required from product team** if not receptionist-operated.

**Information needed**
- Who is waiting, who is called, patient name, appointment time, queue order.

**Important actions**
- Call, complete. Not assumed: check-in, cancel, create bookings.

## Persona 4 — Admin

**Who (from pitch):** Role with basic access control. No staff-user-management feature is named in MVP.

**Goals**
- Ensure the right people can use the dashboard.
- See operational state of the clinic day.

**Responsibilities**
- Access control (how staff accounts are created is **Open decision** — likely seeded, not a self-serve admin UI).

**Access/control requirements**
- Broader view than a single receptionist/doctor if the product team so decides.
- Do **not** specify full audit log, analytics, or user-admin screens as MVP.

**Information needed**
- Same operational picture as staff dashboard; role label visible.

---

# 3. User goals

Goals are outcomes. Features are how the product supports them.

### Patient goals

| Goal | Supporting MVP capability |
| ---- | ------------------------- |
| Be known to the clinic | Registration (patient record) |
| Secure a slot | Booking + clash prevention |
| Trust the booking happened | Web confirmation + appointment reference + SMS confirmation |
| Be reminded | One SMS reminder |
| Return to the booking later | Appointment lookup |
| See what was booked | Appointment details |
| Change the time | Reschedule |
| Drop the booking | Cancel |
| Know place in line | Queue position (after check-in / waiting) |
| Know roughly how long | Rough wait estimate (simple average) |
| Know what to do next | Status-specific instructions |

### Receptionist goals

| Goal | Supporting MVP capability |
| ---- | ------------------------- |
| Sign in securely | Staff login |
| Understand today | Dashboard + appointment list |
| Find a person at the desk | Search |
| Record arrival | Check-in |
| See the live line | Queue view |
| Move the line | Status changes (Booked → … → Completed) |

### Doctor goals

| Goal | Supporting MVP capability |
| ---- | ------------------------- |
| See who is waiting / called | Queue + appointments |
| Take the next patient | Called status (permission TBD) |
| Finish the visit | Completed status (permission TBD) |

### Admin goals

| Goal | Supporting MVP capability |
| ---- | ------------------------- |
| Use the system with appropriate access | Basic roles |
| Not operate a second paper process | Same dashboard |

---

# 4. Information architecture

Two applications in one React frontend (recommended): **Patient site** and **Staff app**, with different entry URLs or a role gate after staff login.

**Assumption:** Patients do not share the staff dashboard. Staff do not book through the patient marketing home, though they may open a patient appointment record.

## 4.1 Patient-facing web application

Keep navigation to **three tasks**. Do not add Account, Messages, Medical records, Payments, or a patient profile area.

```
YɛnCare (patient)
├── Home
├── Book appointment
│   ├── Your details (registration)
│   ├── Choose who you will see   ← Assumption: doctors exist; one clinic
│   ├── Choose date
│   ├── Choose time
│   ├── Review
│   └── Confirmed
├── Find appointment
│   ├── Search
│   ├── Appointment details
│   ├── Reschedule (date → time → review)
│   └── Cancel (confirm)
└── Queue status
    └── (opened from appointment details or Find → result when status ≥ Checked In)
```

| Nav item | Why it exists |
| -------- | ------------- |
| **Home** | Orient; two primary paths: book vs find. Matches Gate 2/3 demo story. |
| **Book appointment** | Core MVP. |
| **Find appointment** | Lookup, cancel, reschedule, and a path into queue — without a patient password account. |
| **Queue status** | Differentiator. Prefer linking from a found appointment rather than a fourth top-level item if the header must stay tiny on mobile. **Recommendation:** Home CTA “Check my queue” goes to Find appointment with helper text, then Queue status. Optional dedicated Queue entry: phone + reference, same lookup. |

**Not in patient IA (MVP):** USSD, SMS composer UI, medical history, payments, clinic directory, language switcher as a product feature (English is the programme/UI language unless the team later decides otherwise).

**Recommended patient authentication model (Assumption, not pitch fact):**  
No patient password. Registration creates a patient record (name + phone). Lookup uses **phone number + appointment reference**. This matches “registration” + “lookup” and low-connectivity reality.

If the team requires patient login, that is an **Open decision** and adds screens (password, reset). Do not add them until decided.

## 4.2 Staff dashboard

```
YɛnCare (staff)
├── Sign in
├── Today (dashboard)
├── Appointments
│   └── Appointment detail (check-in lives here + on the list)
├── Queue
│   └── Patient-in-queue detail (panel or page)
└── Account (name, role, sign out)   ← Supporting UX — not a product feature
```

| Nav item | Why it exists |
| -------- | ------------- |
| **Today** | Fast picture: counts + next actions. Operational, not analytics. |
| **Appointments** | Find, open, check in, see Booked/Completed/Cancelled. |
| **Queue** | Live line: Checked In, Waiting, Called. |
| **Account** | Sign out and see role. Supporting UX. |

**Do not add:** Analytics, audit log, settings for SMS retry, Terraform/infra UI, patient CRM, staff user-admin (unless product decides seeded-only accounts are insufficient — still not a P0).

**Patients as a nav item:** Not required. Search on Appointments covers “find a patient”.

---

# 5. Complete screen inventory

## A. Patient screens

### P01 — Home

| Field | Spec |
| ----- | ---- |
| Purpose | Explain YɛnCare in one screen; start booking or finding an appointment. |
| User | Patient |
| Entry | Direct URL, logo, after sign-out (staff should not land here by default). |
| Main content | Clinic-oriented headline; three tasks: book, find, queue (queue may route via find). Short note: a text message confirms the booking. |
| Primary action | Book appointment |
| Secondary | Find my appointment; Check my queue |
| Information | Product name, tagline, what happens after booking (SMS), no medical claims. |
| Destinations | P02, P09, or P09-as-queue-entry |
| States | Default; Loading (rare); Error (page failed to load) |
| Validation | None |

### P02 — Your details (registration)

| Field | Spec |
| ----- | ---- |
| Purpose | Create or reuse a patient record so a booking can be attached. |
| User | Patient |
| Entry | Home → Book |
| Main content | Full name, Ghana phone number. Short explanation: used for SMS confirmation. |
| Primary action | Continue |
| Secondary | Back to Home |
| Information | Why we need the number. |
| Destinations | P03 (or P04 if doctor is pre-selected — Open decision) |
| States | Default; Invalid; Loading (checking existing phone — Assumption); Error |
| Validation | Name required; phone required; Ghana format **Assumption:** `0XX XXX XXXX` or `+233…` |
| Notes | **Assumption:** if phone already exists, reuse the record; do not invent a password. |

### P03 — Choose who you will see

| Field | Spec |
| ----- | ---- |
| Purpose | Pick a doctor (and show their service as supporting text). |
| User | Patient |
| Entry | P02 |
| Main content | List of doctors available at the single partner clinic. |
| Primary action | Select a doctor → continue |
| Secondary | Back |
| Information | Doctor name; service/specialty if provided by clinic data. |
| Destinations | P04 |
| States | Default; Loading; Empty (no doctors); Error |
| Validation | One selection required |
| **Assumption** | One clinic. Doctors and services come from clinic data. Prefer **one selection step** (doctor with service subtitle), not separate clinic/department/service wizards. |
| **Open decision** | Service-first vs doctor-first. |

### P04 — Choose date

| Field | Spec |
| ----- | ---- |
| Purpose | Pick a day that has at least one open slot. |
| User | Patient |
| Entry | P03 |
| Main content | Calendar or date list; unavailable days disabled. |
| Primary action | Select date |
| Secondary | Back |
| Destinations | P05 |
| States | Default; Loading; Empty (no dates); Error |
| Validation | Must select an enabled date |

### P05 — Choose time

| Field | Spec |
| ----- | ---- |
| Purpose | Pick an open slot. |
| User | Patient |
| Entry | P04 |
| Main content | Available times only. |
| Primary action | Select time |
| Secondary | Back; choose another date |
| Destinations | P06 |
| States | Default; Loading; Empty (no slots that day); Error; slot disappears before continue → P08 |
| Validation | One slot required |

**Supporting UX:** On desktop, P04+P05 may be one screen (date + times). On mobile, two short screens. Not an extra product feature.

### P06 — Review booking

| Field | Spec |
| ----- | ---- |
| Purpose | Confirm details before write + SMS trigger. |
| User | Patient |
| Entry | P05 |
| Main content | Name, phone, doctor, date, time, SMS notice. |
| Primary action | Confirm booking |
| Secondary | Edit details / change slot; Back |
| Destinations | P07 success; P08 clash; error |
| States | Default; Submitting (disable double-submit); Error |
| Validation | None new; server enforces clash |

### P07 — Booking confirmed

| Field | Spec |
| ----- | ---- |
| Purpose | Proof of booking; appointment reference; SMS expectation. |
| User | Patient |
| Entry | P06 success |
| Main content | Success; reference (prominent, copyable); date/time/doctor; “Text message sent to [phone]”; “If the text does not arrive, your booking is still saved — show this reference at the clinic.” |
| Primary action | View appointment |
| Secondary | Book another; Home; Check queue (explains queue starts after check-in) |
| Destinations | P11, P01 |
| States | Success (this screen is the success state) |

### P08 — Slot no longer available

| Field | Spec |
| ----- | ---- |
| Purpose | Recover from booking clash / stale slot. |
| User | Patient |
| Entry | P06 submit or P05 if slot expires |
| Main content | Plain explanation; offer to pick another time. |
| Primary action | Choose another time |
| Secondary | Choose another date; Home |
| Destinations | P05, P04, P01 |

### P09 — Find appointment

| Field | Spec |
| ----- | ---- |
| Purpose | Look up an existing appointment without a patient account. |
| User | Patient |
| Entry | Home; confirmation; header |
| Main content | Phone + appointment reference (**Assumption**). Helper: where to find the reference (SMS or confirmation screen). |
| Primary action | Find appointment |
| Secondary | Book instead |
| Destinations | P11; P10 |
| States | Default; Searching; Validation error; Not found; Network error |
| Validation | Both fields required; phone format |

### P10 — Appointment not found

| Field | Spec |
| ----- | ---- |
| Purpose | Recover from failed lookup. |
| User | Patient |
| Entry | P09 no match |
| Main content | No match; check number and reference; still book. |
| Primary action | Try again |
| Secondary | Book appointment |
| Destinations | P09, P02 |

Can be a state of P09 rather than a separate route. **Supporting UX.**

### P11 — Appointment details

| Field | Spec |
| ----- | ---- |
| Purpose | Single source of truth for the patient’s booking. |
| User | Patient |
| Entry | P07, P09, P13, P17 |
| Main content | Reference, status, doctor, date/time, phone, next-step instruction. Queue summary if status ≥ Checked In. |
| Primary action | Depends on status: Check queue / Reschedule / Cancel |
| Secondary | Find another; Home |
| Destinations | P18, P14, P12 |
| States | Booked; Checked In; Waiting; Called; Completed; Cancelled; Loading; Error |
| Rules | Cancel/reschedule only when status is Booked (**Assumption**). After check-in, changes are staff-side (**Open decision**). |

### P12 — Cancel appointment (confirm)

| Field | Spec |
| ----- | ---- |
| Purpose | Prevent accidental cancellation. |
| User | Patient |
| Entry | P11 |
| Main content | Appointment summary; consequence (slot released; no automatic new booking). |
| Primary action | Yes, cancel |
| Secondary | Keep appointment |
| Destinations | P13; P11 |
| States | Default; Submitting; Error |

### P13 — Appointment cancelled

| Field | Spec |
| ----- | ---- |
| Purpose | Confirm cancellation; offer to book again. |
| User | Patient |
| Entry | P12 success |
| Primary action | Book a new appointment |
| Secondary | Home |
| Destinations | P02, P01 |

### P14 / P15 / P16 — Reschedule (date, time, review)

Same pattern as P04–P06, pre-filled with current appointment, excluding the current slot from “taken” if policy keeps it until confirm (**Open decision**).

| Field | Spec |
| ----- | ---- |
| Purpose | Move to a new available slot with clash prevention. |
| Primary action | Confirm new time |
| Destinations | P17; P08; P11 on abandon |
| States | Loading slots; Empty; Submitting; Clash |

### P17 — Appointment updated

| Field | Spec |
| ----- | ---- |
| Purpose | Confirm new time; mention SMS if a new confirmation is sent (**Assumption:** yes, send an updated SMS). |
| Primary action | View appointment |
| Destinations | P11 |

### P18 — Queue status

| Field | Spec |
| ----- | ---- |
| Purpose | Answer: Where am I? How long might I wait? What is happening? What should I do? |
| User | Patient |
| Entry | P11; Home “Check my queue” after lookup |
| Main content | Status name; position (only when Waiting); rough wait with disclaimer; next step; appointment time (labelled as **appointment time, not queue time**). |
| Primary action | Refresh |
| Secondary | View appointment details |
| Destinations | P11 |
| States | See §10. Loading; refresh error; not yet in queue (Booked); completed; cancelled |

**Do not** show a predictive graph or historical analytics.

---

## B. Staff screens

### S01 — Sign in

| Field | Spec |
| ----- | ---- |
| Purpose | Authenticate staff. |
| User | Receptionist, Doctor, Admin |
| Entry | `/staff` or similar |
| Main content | Clinic name, email/username + password (**Assumption:** staff credentials, not OTP). |
| Primary action | Sign in |
| Secondary | None (no public sign-up). Forgot password **P2 / Open decision**. |
| Destinations | S02; error |
| States | Default; Submitting; Invalid credentials; Network; Unauthorized role |

### S02 — Today (dashboard)

| Field | Spec |
| ----- | ---- |
| Purpose | Operational snapshot of the clinic day — not analytics. |
| User | All staff roles (numbers may be scoped — TBD) |
| Entry | After login; nav |
| Main content | Date; counts: today’s appointments, booked (not arrived), checked in, waiting, called, completed; short list of next arrivals / now waiting; shortcuts. |
| Primary actions | Go to Queue; Go to Appointments; Check in (deep link to search) |
| Secondary | Sign out |
| States | Loading; Empty (no appointments today); Error |

**Not included:** busiest hours, trend charts (stretch).

### S03 — Appointments

| Field | Spec |
| ----- | ---- |
| Purpose | Find and open any of today’s (and optionally upcoming) appointments. |
| User | Staff |
| Entry | Nav; dashboard |
| Main content | Search (name, phone, reference); filters: status, doctor (**Assumption**); list/table. |
| Primary action | Open appointment |
| Secondary | Check in from row if Booked |
| Destinations | S04 |
| States | Loading; Empty; No search results; Error |

**Date range:** Default today. Other days **Assumption:** allowed via date control so staff can prepare tomorrow — Supporting UX.

### S04 — Appointment details (staff)

| Field | Spec |
| ----- | ---- |
| Purpose | Full record + primary check-in action. |
| User | Staff |
| Entry | S03, Queue, search |
| Main content | Patient name, phone, reference, doctor, time, status, queue position if any. |
| Primary action | Status-dependent: Check in / Call / Complete (by permission) |
| Secondary | Back to list / queue |
| Destinations | S03, S05; confirmation toast |
| States | Loading; Error; success toast after status change |

Check-in is an **action**, not a separate product area. A dedicated check-in page is unnecessary if search + details + row action exist.

### S05 — Live queue

| Field | Spec |
| ----- | ---- |
| Purpose | Run the line: Checked In, Waiting, Called. |
| User | Staff |
| Entry | Nav; dashboard |
| Main content | Ordered queue; position; wait estimate (same simple average as patient); status; actions. |
| Primary action | Call next / change status |
| Secondary | Open patient; refresh |
| Destinations | S06, S04 |
| States | Loading; Empty queue; Error; stale-data warning on refresh fail |

### S06 — Queue patient (panel or page)

| Field | Spec |
| ----- | ---- |
| Purpose | Confirm identity before status change. |
| User | Staff |
| Entry | S05 item |
| Main content | Same as S04 focused on queue actions |
| Primary action | Call / Complete / (if permitted) return to waiting |
| States | Default; Confirm destructive-ish changes; Error |
| **Supporting UX** | Prefer a side panel on desktop, full screen on mobile. |

### S07 — Unauthorized / session expired

**Supporting UX — not an additional product feature.**

### S08 — Account

Name, role, sign out. **P1 supporting.** No settings, no audit, no SMS admin.

---

## C. Global supporting states

| State | Where |
| ----- | ----- |
| Page loading | All routes |
| Network failure | All mutating and fetching views |
| Server error | All |
| Session expired | Staff |
| 404 | Unknown routes |
| Duplicate submit lock | Booking, cancel, reschedule, status change |

---

# 6. Patient user flow

```
Home
        │
        ├── [Book appointment]
        │         ↓
        │   Your details (new record vs existing phone — decision)
        │         ↓
        │   Choose doctor
        │         ↓
        │   Choose date
        │         ├── [no dates] → empty + try later / another doctor
        │         ↓
        │   Choose time
        │         ├── [no times] → pick another date
        │         ↓
        │   Review
        │         ├── [Confirm]
        │         │         ├── success → Booking confirmed → Appointment details
        │         │         │                                      ├── [Booked] stay / leave
        │         │         │                                      └── later: Find → Details → Queue
        │         │         ├── clash → Slot unavailable → Choose time
        │         │         └── network/server → retry (form preserved)
        │         └── [Back] → previous step
        │
        └── [Find appointment] / [Check my queue]
                  ↓
            Enter phone + reference
                  ├── found → Appointment details
                  │              ├── Booked → Reschedule | Cancel | (queue: “not in line yet”)
                  │              ├── Checked In / Waiting / Called → Queue status
                  │              ├── Completed → read-only details
                  │              └── Cancelled → read-only + book again
                  └── not found → try again | book
```

### Decision points (must be visible in prototype)

1. Book vs Find vs Queue entry  
2. New phone vs existing patient record  
3. Doctor list empty vs available  
4. Dates available vs none  
5. Times available vs none  
6. Booking success vs clash vs network fail  
7. Lookup found vs not found  
8. Status = Booked → allow cancel/reschedule  
9. Cancel confirm vs keep  
10. Reschedule slots available vs none vs clash  
11. Status in queue → Queue status content changes  

---

# 7. Patient booking flow (ideal MVP)

**Design intent:** Fewest steps that remain obvious to mixed-literacy, mixed-connectivity users. One clinic. No account password.

### 1. Information required to create a booking

- Patient identity (name, phone)  
- Who they will see (doctor; service as label)  
- Date  
- Time slot  
- Consent-to-contact is implicit in providing a number for SMS — **do not invent a legal consent product**; **Open decision** if clinic requires an explicit SMS tick.

### 2. Collected from the patient

- Full name  
- Phone number  

### 3. Selected by the patient

- Doctor  
- Date (only open days)  
- Time (only open slots)  

### 4. Order

1. Details  
2. Doctor  
3. Date  
4. Time  
5. Review → submit  

Rationale: identity first so SMS destination is known; doctor before calendar because slots are per doctor (**Assumption**).

### 5. Confirm before submission

Name, phone, doctor, date, time, sentence: “We will send a confirmation text to this number.”

### 6. Success

Write appointment; show P07; trigger SMS confirmation (async). Reference on screen immediately. Do not wait for SMS delivery to show success.

### 7. Failure (server/network)

Keep form data; explain; Retry. Do not claim SMS was sent.

### 8. Slot no longer available

P08; return to time list for the same date; refresh slots from server.

### 9. Appointment reference

Short, speakable, high contrast. Example pattern **Assumption:** `YC-4821` or `YC-30AUG-4821`. Show in web confirmation, details, and tell the user it will also be in the SMS.

### 10. SMS communication on web

- Before submit: will send a text.  
- After success: “Confirmation text sent to [masked phone].”  
- Caveat: “If you do not get the text, the booking is still saved. Use this reference.”  
- Do not show delivery receipts, retry queues, or tracking (stretch).  
- Reminder: “We will send one reminder text before your appointment.” Do not let the patient configure reminder time in MVP.

---

# 8. Appointment management flows

## Lookup

```
Patient → Find appointment → Phone + reference → Search
    ├── Found → Appointment details
    └── Not found → Try again | Book
```

| | |
| --- | --- |
| Confirmation | None beyond field validation |
| Errors | Invalid fields; not found; network |
| Success | Details |
| Navigation | Stay in patient app; no auto-login account |

## Cancellation

```
Appointment details (Booked) → Cancel → Confirm → Cancelled
```

| | |
| --- | --- |
| Confirmation | Explicit yes/no with date/time shown |
| Errors | Already cancelled; already checked in (**Assumption**); network |
| Success | P13; optional SMS **Open decision** |
| Navigation | Primary: book again; no undo in MVP (**Assumption**) |

## Rescheduling

```
Appointment details (Booked) → Reschedule → Date → Time → Confirm → Updated
```

| | |
| --- | --- |
| Confirmation | Review new slot vs old |
| Errors | No slots; clash; not Booked; network |
| Success | P17; **Assumption:** SMS with new time |
| Navigation | Details with new time |

Automatic rescheduling when a doctor is unavailable is **stretch**. Staff manually handling that is **Open decision**, not an engine.

---

# 9. Virtual queue UX

Lifecycle from pitch (do not add No-show, Skipped, or On-hold as MVP statuses):

**Booked → Checked In → Waiting → Called → Completed**

**Cancelled** is an appointment outcome, not a queue step.

**Estimate (pitch):** simple average, not historical modelling.  
**Assumption for copy, not an algorithm claim:** `rough wait ≈ people ahead × clinic average minutes per visit`. Average minutes is clinic configuration (**Open decision**). UI must say it is a **guide**.

### Status specifications

#### Booked

| | Patient | Staff |
| --- | --- | --- |
| Meaning | Slot reserved; not at clinic yet | Upcoming / not arrived |
| Shown | Date, time, doctor, reference, “You are not in the queue yet.” | List row; status Booked |
| Actions | Reschedule, cancel, find later | Check in when they arrive |
| Next | Checked In | Checked In |
| Notifications | SMS confirmation; later one reminder | None |
| Empty/error | — | Patient not in today’s list → search |

**Patient next step:** “Come to the clinic on [date]. Tell reception your name or reference. They will check you in.”

#### Checked In

| | Patient | Staff |
| --- | --- | --- |
| Meaning | Reception has recorded arrival | Arrived; entering / in pre-wait |
| Shown | “Reception has checked you in.” Position if already assigned | Status; time of check-in if available (**Assumption**) |
| Actions | Refresh queue; no cancel (**Assumption**) | Move to Waiting if not automatic |
| Next | Waiting | Waiting |
| Notifications | MVP: no extra SMS required | — |
| Empty/error | Lookup works; queue position may still be preparing | |

**Open decision:** Is Checked In → Waiting automatic on check-in, or a second staff click? UX must support both: if automatic, patient may barely see Checked In.

#### Waiting

| | Patient | Staff |
| --- | --- | --- |
| Meaning | In the live line | Ordered waiting list |
| Shown | **You are number N in the queue.** Rough wait + disclaimer. “Stay nearby.” | Position, name, doctor, wait guide, Call action |
| Actions | Refresh | Call |
| Next | Called | Called |
| Notifications | MVP web refresh only; no SMS “you’re next” (not in MVP) | — |
| Empty/error | Position missing → “We could not load your place. Retry.” | Empty queue state |

**Copy:** “This wait time is only a guide. It may be shorter or longer.”

#### Called

| | Patient | Staff |
| --- | --- | --- |
| Meaning | It is their turn | Currently with / summoned to doctor |
| Shown | “It is your turn. Please go in to see [doctor].” Hide position/wait. | Called highlight; Complete action |
| Actions | None required | Complete |
| Next | Completed | Completed |
| Notifications | Not in MVP SMS | — |

#### Completed

| | Patient | Staff |
| --- | --- | --- |
| Meaning | Visit finished | Done |
| Shown | “Your visit is finished.” No queue. | Counts toward completed |
| Actions | Book another (optional) | None |
| Next | Terminal | Terminal |

### Four questions (must be answerable in 5 seconds on P18)

| Question | How the UI answers |
| -------- | ------------------ |
| Where am I? | Status word + position if Waiting |
| How long might I wait? | Rough minutes + “guide only” |
| What is happening now? | One sentence per status |
| What should I do next? | One instruction per status |

### Confusion to prevent

Appointment **time** ≠ queue **position**. Always label: “Your appointment time” vs “Your place in the queue today”.

---

# 10. Staff dashboard UX

Purpose: run the day, not decorate KPIs.

### Priority information (top → down)

1. Today’s date and clinic context (single clinic).  
2. Counts: Appointments today · Not yet arrived (Booked) · Waiting · Called · Completed.  
3. Actionable list: next arrivals (Booked, soonest) OR now waiting (if queue is the bottleneck).  
4. Primary shortcuts: Open queue · Find appointment.

### Metrics allowed

Simple **today counts**. No charts, no busiest-hour analytics.

### Efficiency rules

- Check in from list row or details (one or two clicks).  
- Call next from queue without opening a second app section if possible.  
- Search always visible on Appointments.  
- Status visible as text + shape/icon, not colour alone.

---

# 11. Staff queue management workflow

```
1. Patient arrives at reception
2. Staff: Appointments → search name / phone / reference
3. Staff opens record (or uses row action)
4. Staff: Check in
5. System: Booked → Checked In → (Waiting immediately or via second action)
6. Patient waits; may open Queue status on their phone if they have data
7. Staff (or doctor): Call → Called
8. Staff (or doctor): Complete → Completed
```

### UI interaction per stage

| Stage | Interaction |
| ----- | ----------- |
| Arrive | Physical; no kiosk in MVP |
| Find | Search field; results update; empty state |
| Check in | Button “Check in”; disable if not Booked; confirm only if easy to mis-tap (**P1**) |
| Enter queue | Automatic or “Add to queue” — **Open decision** |
| Wait | Queue list ordered; position numbers |
| Call | “Call [Name]” on first waiting or on selected row |
| Status | Immediate visual update; toast “Checked in” / “Called” / “Completed” |
| Complete | “Complete visit” on Called patient |

### Role actions

| Action | Receptionist | Doctor | Admin |
| ------ | ------------ | ------ | ----- |
| View appointments | Inferred yes | Inferred yes (possibly own only — TBD) | Inferred yes |
| Check in | Inferred yes (front desk) | **TBD — Product decision required** | **TBD** |
| Call | **TBD** (often receptionist or doctor) | Inferred likely | **TBD** |
| Complete | **TBD** | Inferred likely | **TBD** |
| Cancel/reschedule for patient | **TBD** | **TBD** | **TBD** |
| Create walk-in appointment | **TBD** | **TBD** | **TBD** |

Where the pitch does not specify: **Permission decision required from product team.**

---

# 12. Role-based UX

Only what can be inferred. Everything else is TBD.

| Role | Can View | Can Create | Can Update | Can Check In | Can Manage Queue |
| ---- | -------- | ---------- | ---------- | ------------ | ---------------- |
| **Patient** (web) | Own appointment after lookup; queue for that appointment | Own booking; own registration record | Own booking while Booked (cancel/reschedule) | No | No |
| **Receptionist** | Today’s appointments; live queue | **TBD — walk-in / staff booking** | Status on check-in path **inferred** | **Inferred yes** | **Inferred yes** for check-in → waiting; Call/Complete **TBD** |
| **Doctor** | Queue; appointments **TBD: all vs own** | No (inferred) | Called → Completed **inferred** | **TBD — Product decision required** | Call + Complete **inferred**; check-in **TBD** |
| **Admin** | At least what staff can view | **TBD** | **TBD** | **TBD** | **TBD** |

**Do not build** a permission matrix UI or audit viewer in MVP.

**Supporting UX:** Show the signed-in **name and role** in the staff header so people do not act in the wrong account.

---

# 13. Responsive UX architecture

**Patient app: mobile-first.** Smartphone users in Ghana; one-column, thumb-friendly.  
**Staff app: desktop-first**, still usable on a clinic laptop/tablet; stacked on phone.

| Element | Mobile | Tablet | Desktop |
| ------- | ------ | ------ | ------- |
| **Patient nav** | Top bar: logo + menu (Book, Find) or two text links. Sticky bottom CTA only if it does not hide errors. | Same, more horizontal room | Header links visible |
| **Staff nav** | Bottom or hamburger: Today, Appointments, Queue | Collapsible sidebar | Persistent sidebar |
| **Tables** | Cards (one appointment per card) | Cards or compact table | Table with sticky header |
| **Forms** | Single column; one primary CTA full-width | Single column max-width | Max-width ~480–560px centred for patient forms |
| **Cards** | Full width, stacked | 2-col lists optional | 2–3 col doctor list |
| **Queue (patient)** | Huge position number; wait below; instruction below | Same | Same, not a dashboard widget |
| **Queue (staff)** | Stacked cards with actions | Split list | List + detail panel |
| **Appointment info** | Stacked definition list | Same | Two-column definition list |
| **Buttons** | Min 44×44; one primary per view | Same | Primary not full viewport width |
| **Modals** | Full-screen sheets (cancel confirm) | Dialog | Dialog centred |
| **Date/time** | Date screen then time screen | Combined possible | Combined date + time grid |

Breakpoints are a visual-design task; this only defines **behaviour**.

---

# 14. Low-connectivity UX (MVP)

Offline-first dashboard sync is **out of scope**.

### Principles

1. Small pages; little media; no decorative motion.  
2. Every wait has a textual loading state.  
3. Retry on failure; do not silently fail.  
4. Preserve typed form data in session while the tab lives.  
5. Disable submit while in-flight (booking clash + double SMS risk).  
6. Success of **booking** is independent of **SMS delivery**.  
7. Queue page: manual Refresh + last-updated time; optional light polling **Assumption** — if used, make it infrequent and resilient.  
8. Staff: if clinic internet drops, show “Cannot update the live queue until the connection returns.” Do not fake offline editing.

### What the MVP does when the network is poor

- Slow: skeleton or “Loading…”  
- Fail: “No connection. Check your internet and try again.” + Retry  
- Staff dashboard: last known data only if already loaded, clearly marked outdated **Supporting UX**; no sync engine

---

# 15. SMS experience (web UX around SMS)

Do not design an SMS UI, USSD menus, or delivery-tracking console.

```
Booking saved
    ↓
Web confirmation (reference visible immediately)
    ↓
SMS confirmation (async)
    ↓
One reminder before appointment (server-scheduled; patient does not configure)
```

### What the web should say

| Moment | Message intent |
| ------ | -------------- |
| Review | We will send a confirmation text to [phone]. |
| Success | Confirmation text sent to [phone]. If it does not arrive, your booking is still saved. Reference: [ref]. |
| Details | Reminder: you will get one text before the appointment. |
| SMS not received | No “resend” product in MVP (**Open decision** as P2 supporting). Tell them to use the reference and Find appointment. |
| Reminder | Not shown as a separate web screen. |

Sandbox delays are a known risk (scope sheet). UX must not depend on instant SMS for the demo to feel complete — web confirmation is enough visually.

---

# 16. Forms and validation

Uncertain rules are **Assumptions**.

### F1 — Patient details

| | |
| --- | --- |
| Required | Full name, phone |
| Optional | None in MVP (no email unless product adds — **Open decision**) |
| Validation | Name non-empty; phone Ghana format (assume `0` + 9 digits or `+233` + 9) |
| Errors | “Enter your full name.” “Enter a Ghana phone number, for example 024 123 4567.” |
| Loading | Continue disabled; “Saving…” if a register API is called |
| Success | Next step |
| Disabled | Submit while request open |

### F2 — Find appointment

| | |
| --- | --- |
| Required | Phone, reference |
| Optional | — |
| Validation | Same phone rule; reference non-empty / pattern **Assumption** |
| Errors | Field errors; “No appointment matches. Check the number and reference.” |
| Loading | “Searching…” |
| Success | Details |
| Disabled | While searching |

### F3 — Review booking / reschedule confirm

No extra fields. Submit locked while pending.

### F4 — Staff login

| | |
| --- | --- |
| Required | Identifier, password |
| Errors | “Email or password is not correct.” (do not reveal which) |
| Loading | Sign in disabled |
| Success | Today |

### F5 — Staff search

Optional filters. No required fields. Empty query = today’s list.

**Not a form:** queue status changes are actions with toasts.

---

# 17. System states matrix

### Loading

| Situation | User sees | Understands | Action |
| --------- | --------- | ----------- | ------ |
| Initial page | Page skeleton / “Loading” | Wait | None |
| Booking submit | Button “Booking…” | Do not tap again | None |
| Lookup | “Searching…” | Wait | None |
| Reschedule slots | “Loading times…” | Wait | Back |
| Cancellation | “Cancelling…” | Wait | None |
| Queue refresh | “Updating…” or subtle last-updated | May be stale until done | Wait / retry if fail |

### Empty

| Situation | Sees | Understands | Action |
| --------- | ---- | ----------- | ------ |
| No doctors | Empty doctors | Cannot book now | Retry; Home |
| No dates/slots | Empty calendar/times | Try other day/doctor | Change selection |
| Staff no appointments today | Empty list | Quiet day | None |
| Empty queue | “No patients in the queue” | No one waiting | Go to appointments |
| Search no hits | “No matching appointments” | Try another query | Clear / retry |

### Error

| Situation | Sees | Understands | Action |
| --------- | ---- | ----------- | ------ |
| Network | Connection message | Temporary | Retry |
| Server | “Something went wrong” | Not their fault | Retry later |
| Invalid input | Field errors | What to fix | Edit |
| Booking conflict | Slot taken | Choose another | New time |
| Not found | No match | Wrong details | Retry / book |
| Unauthorized | Staff cannot view | Wrong role / login | Sign in / Home |

### Success

| Situation | Sees | Understands | Action |
| --------- | ---- | ----------- | ------ |
| Registration | Next booking step (may be silent) | Details accepted | Continue |
| Booking | P07 | Booked; reference | View / home |
| Cancellation | P13 | Slot gone | Book again |
| Reschedule | P17 | New time | View |
| Check-in | Toast + new status | Patient in flow | Queue |
| Queue change | List updates + toast | Line moved | Continue |

---

# 18. Accessibility requirements

Target **WCAG 2.2 AA** where practical. Do not over-engineer.

- Contrast: text and UI ≥ 4.5:1 (3:1 for large text).  
- Type: readable body size; avoid long all-caps.  
- Keyboard: all staff and patient actions reachable; visible focus.  
- Labels: every input has a visible label (not placeholder-only).  
- Errors: text next to field; `aria-invalid` / described-by.  
- Touch: 44×44 px minimum.  
- Screen readers: page titles per screen; live region for queue refresh and toasts.  
- Status: never colour-only (Booked/Waiting/Called). Use text + optional icon.  
- Position number: announced as text “Number 4 in the queue”, not colour bars alone.  
- Reduce motion: respect `prefers-reduced-motion`; no essential info in animation.  
- Language: clear English; YɛnCare spelling preserved in the name.

---

# 19. Content / microcopy

**Voice:** Simple Ghanaian English. Short sentences. No slang that excludes. No medical claims. No “AI”. No “synergies”.

### Primary CTAs

| Use | Copy |
| --- | ---- |
| Book | Book appointment |
| Continue | Continue |
| Confirm book | Confirm booking |
| Find | Find appointment |
| Cancel | Cancel appointment |
| Confirm cancel | Yes, cancel appointment |
| Keep | Keep appointment |
| Reschedule | Change appointment time |
| Confirm reschedule | Confirm new time |
| Queue | Check my queue |
| Refresh | Refresh |
| Check-in | Check in |
| Call | Call patient |
| Complete | Complete visit |
| Staff login | Sign in |
| Retry | Try again |

### Booking confirmation

**Your appointment is booked.**  
Reference: **YC-0000**  
[Doctor] · [Weekday, date] · [Time]  
We sent a confirmation text to [phone]. If the text does not arrive, your booking is still saved. Show this reference at the clinic.

### Cancellation confirmation (dialog)

Cancel this appointment on [date] at [time]?  
This time will be given to someone else. You can book again afterwards.

### Cancellation success

This appointment is cancelled.  
You can book a new time if you still need to come in.

### Rescheduling confirmation

Change this appointment to [new date, time] with [doctor]?

### Reschedule success

Your appointment time has been changed.  
[New date, time]. We will send a text to [phone] with the new time. (**Assumption**)

### Queue status

| Status | Patient copy |
| ------ | ------------ |
| Booked | You are not in the queue yet. Come to the clinic and check in at reception. |
| Checked In | Reception has checked you in. Please wait to be called. |
| Waiting | You are number **[N]** in the queue. Typical wait from here is about **[X] minutes**. This is only a guide. Stay nearby. |
| Called | It is your turn. Please go in to see [doctor]. |
| Completed | Your visit is finished. |
| Cancelled | This appointment was cancelled. |

### Estimated wait

Typical wait from here is about **[X] minutes**.  
This is a rough guide, not an exact time.

### Errors (examples)

- No internet. Check your connection and try again.  
- This time was just taken. Please choose another time.  
- We could not find an appointment with those details.  
- Enter a Ghana phone number, for example 024 123 4567.  
- Email or password is not correct.  
- You do not have access to this page.

### Empty

- No appointment times on this day. Try another date.  
- No patients in the queue.  
- No appointments match your search.

### Loading

- Loading…  
- Booking…  
- Searching…  
- Updating queue…

### Check-in confirmation (staff toast)

[Name] is checked in.

### Patient instructions (by status)

See queue table above. One instruction only per screen.

---

# 20. UX design principles (for Figma Agent)

1. **One job per screen.** Especially on the patient mobile path.  
2. **Clarity over completeness.** Show only what is needed to book, find, or queue.  
3. **Reference is trust.** The appointment code must be the most visible object after booking.  
4. **Queue honesty.** Position and wait must be understandable; wait is always a guide.  
5. **SMS is proof, not the booking.** Never block success on SMS delivery.  
6. **Low-connectivity respect.** Light pages, obvious loading, retry, keep typed data, no extra animation.  
7. **Mobile-first patients, desktop-first staff.**  
8. **Staff speed.** Two clicks from search to check-in whenever possible.  
9. **Healthcare calm.** No gamification, no alarmist red except real errors.  
10. **Access for mixed ability.** Large targets, labels, keyboard, not colour-only status.  
11. **English, human, Ghana-appropriate.** YɛnCare is the name; UI is plain English.  
12. **MVP discipline.** If it is USSD, analytics, offline sync, auto-reschedule, or audit log, do not draw it.

---

# 21. Screen priority

### P0 — Essential for MVP

**Patient:** P01 Home · P02 Details · P03 Doctor · P04 Date · P05 Time · P06 Review · P07 Confirmed · P08 Slot taken · P09 Find · P11 Details · P12 Cancel confirm · P14–P16 Reschedule · P18 Queue  

**Staff:** S01 Login · S02 Today · S03 Appointments · S04 Appointment detail · S05 Queue  

**Global:** Network error + retry; submitting locks  

P10 Not found and P13/P17 success may be states of P09/P11/P07 rather than extra files — still P0 as states.

### P1 — Important supporting UX

- Combined date+time layout for desktop  
- P10 as dedicated empty lookup  
- Staff S06 queue panel  
- S07 unauthorized / session  
- S08 account / sign out  
- Check-in confirm micro-dialog if mis-tap is likely  
- Last-updated on queue  
- Masked phone display  
- Copy reference control  

### P2 — Nice to have (time permitting)

- Forgot password  
- SMS resend  
- Walk-in create form  
- Print / share reference  
- Patient language toggle  
- Staff date-range beyond today  
- Remember phone on device  

**Never P0:** USSD, SMS booking menus, offline sync, analytics, audit, auto-reschedule, delivery tracking.

---

# 22. MVP vs future-vision boundary

| Feature | MVP | Future/Stretch | Reason |
| ------- | --- | -------------- | ------ |
| Web registration | Yes | | Pitch MVP |
| Web booking | Yes | | Pitch MVP + Gate 2 |
| Web lookup | Yes | | Pitch MVP |
| Cancel | Yes | | Pitch MVP + Gate 3 |
| Reschedule (manual slot pick) | Yes | | Pitch MVP + Gate 3 |
| SMS confirmation | Yes | | Pitch MVP + Gate 2 |
| One SMS reminder | Yes | | Pitch MVP + Gate 3 |
| SMS as booking channel | | Yes | Narrative vs commitment; not in MVP table |
| SMS queue-position check | | Yes | Same |
| USSD | | Yes | Explicit stretch; after Gate 3 only if time |
| Staff dashboard | Yes | | Pitch MVP |
| Staff check-in | Yes | | Pitch MVP |
| Queue management | Yes | | Pitch MVP |
| Virtual queue states | Yes | | Booked → … → Completed |
| Queue position | Yes | | Pitch MVP |
| Rough wait (simple average) | Yes | | Pitch MVP |
| Historical / ML wait | | Yes | “Not historical modelling” |
| Roles Admin / Doctor / Receptionist | Yes (basic) | | Pitch MVP |
| Full RBAC admin UI | | Likely | Not specified |
| Booking clash prevention | Yes | | DB constraint |
| Exhaustive concurrency suite | | Partial | One targeted test, not full suite |
| Notification retry / delivery tracking | | Yes | Explicitly out |
| Offline-first dashboard sync | | Yes | Explicitly out |
| Auto-reschedule engine | | Yes | Explicitly out |
| Full analytics | | Yes | Explicitly out |
| Full audit log | | Yes | Explicitly out |
| AWS Lambda/Dynamo/EventBridge/SQS/Terraform | | Yes | One service, one DB |
| Multi-clinic marketplace | | Yes | Single partner clinic |
| Payments, records, prescriptions | | Yes | Not in pitch |

---

# 23. Figma-ready screen specifications (P0 + P1)

Visual design (colour, type, illustration) is **out of this document**. Hierarchy and content only.

---

## Screen: Home (P01)

**Purpose:** Start book, find, or queue lookup.  
**User:** Patient  
**Entry point:** Root URL  
**Layout hierarchy:** 1. Product name + tagline 2. One-sentence problem/solution 3. Primary CTA 4. Secondary tasks 5. SMS note  
**Required content:** YɛnCare; “Healthcare access, wherever you are.”; Book appointment; Find my appointment; Check my queue; note that a text confirms bookings  
**Primary CTA:** Book appointment  
**Secondary actions:** Find my appointment; Check my queue  
**Navigation:** Header with same two tasks  
**States:** Default; page error  
**Validation:** None  
**Responsive behavior:** Mobile-first single column; CTAs stacked full width  
**Accessibility considerations:** One h1; CTAs as buttons/links; SMS note not only in an image  
**Next screens:** P02, P09  

---

## Screen: Your details (P02)

**Purpose:** Registration record  
**User:** Patient  
**Entry point:** Book  
**Layout hierarchy:** 1. Title 2. Why we ask 3. Name 4. Phone 5. Continue  
**Required content:** Full name; phone; SMS purpose sentence  
**Primary CTA:** Continue  
**Secondary actions:** Back  
**Navigation:** Step indicator optional P1 (Details / Doctor / Date / Time / Review) — Supporting UX  
**States:** Default; field error; loading; network error  
**Validation:** Name, Ghana phone  
**Responsive behavior:** Single column form  
**Accessibility considerations:** Labels; autocomplete name/tel  
**Next screens:** P03  

---

## Screen: Choose who you will see (P03)

**Purpose:** Select doctor  
**User:** Patient  
**Entry point:** P02  
**Layout hierarchy:** 1. Title 2. Doctor list (name + service subtitle)  
**Required content:** Doctors from clinic data  
**Primary CTA:** Select row (or Continue after select)  
**Secondary actions:** Back  
**Navigation:** Back to P02  
**States:** Default; loading; empty; error  
**Validation:** Selection required  
**Responsive behavior:** Stacked cards; tablet 2-col  
**Accessibility considerations:** List as radios or buttons with selected state  
**Next screens:** P04  

---

## Screen: Choose date (P04)

**Purpose:** Select available day  
**User:** Patient  
**Entry point:** P03  
**Layout hierarchy:** 1. Doctor context 2. Calendar/list 3. Unavailable days clearly not selectable  
**Required content:** Month; available vs unavailable  
**Primary CTA:** Selecting a date continues  
**Secondary actions:** Back  
**States:** Default; loading; no dates; error  
**Validation:** Enabled date only  
**Responsive behavior:** Large calendar cells on mobile  
**Accessibility considerations:** Date names announced; disabled dates stated  
**Next screens:** P05  

---

## Screen: Choose time (P05)

**Purpose:** Select open slot  
**User:** Patient  
**Entry point:** P04  
**Layout hierarchy:** 1. Date context 2. Time chips/grid 3. Empty message  
**Required content:** Only bookable times  
**Primary CTA:** Select time  
**Secondary actions:** Change date  
**States:** Default; loading; empty; error  
**Validation:** One slot  
**Responsive behavior:** Wrap chips; desktop combine with P04  
**Accessibility considerations:** Times as toggle buttons  
**Next screens:** P06, P08  

---

## Screen: Review booking (P06)

**Purpose:** Confirm before write  
**User:** Patient  
**Entry point:** P05  
**Layout hierarchy:** 1. Summary list 2. SMS sentence 3. Confirm 4. Change links  
**Required content:** Name, phone, doctor, date, time  
**Primary CTA:** Confirm booking  
**Secondary actions:** Change details; change time  
**Navigation:** Back preserves selections  
**States:** Default; Booking… (disabled); network error; clash → P08  
**Validation:** Server-side clash  
**Responsive behavior:** Summary stacked  
**Accessibility considerations:** Disable double submit; status message on error  
**Next screens:** P07, P08  

---

## Screen: Booking confirmed (P07)

**Purpose:** Proof + reference + SMS expectation  
**User:** Patient  
**Entry point:** P06 success  
**Layout hierarchy:** 1. Success title 2. Reference (largest) 3. Appointment facts 4. SMS caveats 5. View appointment  
**Required content:** Reference; when; who; phone; SMS sent + still saved if SMS fails  
**Primary CTA:** View appointment  
**Secondary actions:** Home; Book another  
**States:** Success only  
**Validation:** None  
**Responsive behavior:** Reference wraps but stays prominent  
**Accessibility considerations:** Focus to heading; reference selectable/copyable  
**Next screens:** P11, P01  

---

## Screen: Slot no longer available (P08)

**Purpose:** Recover from clash  
**User:** Patient  
**Entry point:** Failed confirm  
**Layout hierarchy:** 1. Explanation 2. Choose another time  
**Required content:** Time was taken; pick another  
**Primary CTA:** Choose another time  
**Secondary actions:** Choose another date; Home  
**States:** Default  
**Next screens:** P05, P04  

---

## Screen: Find appointment (P09)

**Purpose:** Lookup  
**User:** Patient  
**Entry point:** Home, header  
**Layout hierarchy:** 1. Title 2. Helper (reference is on SMS and confirmation) 3. Phone 4. Reference 5. Find  
**Required content:** Two fields; link to book  
**Primary CTA:** Find appointment  
**Secondary actions:** Book appointment  
**States:** Default; searching; validation; not found; network  
**Validation:** Both required  
**Responsive behavior:** Single column  
**Accessibility considerations:** Error summary  
**Next screens:** P11, P10  

---

## Screen: Appointment not found (P10) — P1 as page / P0 as state

**Purpose:** Recovery  
**Layout hierarchy:** Message; Try again; Book  
**Primary CTA:** Try again  
**Next screens:** P09, P02  

---

## Screen: Appointment details (P11)

**Purpose:** Status + actions  
**User:** Patient  
**Entry point:** P07, P09  
**Layout hierarchy:** 1. Status 2. Reference 3. When/who 4. Next step 5. Queue teaser if in queue 6. Reschedule / Cancel if Booked  
**Required content:** All booking facts; status text  
**Primary CTA:** Status-dependent  
**Secondary actions:** Find another  
**States:** Each lifecycle status; cancelled; loading; error  
**Validation:** Hide illegal actions  
**Responsive behavior:** Stacked  
**Accessibility considerations:** Status not colour-only  
**Next screens:** P18, P12, P14  

---

## Screen: Cancel confirm (P12)

**Purpose:** Prevent mistakes  
**Layout hierarchy:** Consequence; Yes cancel; Keep  
**Primary CTA:** Yes, cancel appointment  
**Secondary:** Keep appointment  
**States:** Default; Cancelling…; error  
**Responsive behavior:** Full-screen sheet on mobile  
**Next screens:** P13, P11  

---

## Screen: Appointment cancelled (P13)

**Purpose:** Closure  
**Primary CTA:** Book a new appointment  
**Next screens:** P02, P01  

---

## Screen: Reschedule date / time / review (P14–P16)

**Purpose:** New slot  
Same hierarchy as P04–P06 with old time shown for comparison on review.  
**Primary CTA:** Confirm new time  
**Next screens:** P17, P08, P11  

---

## Screen: Appointment updated (P17)

**Purpose:** New time proof  
**Required content:** New when; SMS assumption  
**Primary CTA:** View appointment  
**Next screens:** P11  

---

## Screen: Queue status (P18)

**Purpose:** Position, wait guide, next step  
**User:** Patient  
**Entry point:** Details  
**Layout hierarchy:** 1. Status 2. Large position (Waiting only) 3. Rough wait + disclaimer 4. What to do 5. Appointment time labelled separately 6. Refresh · last updated  
**Required content:** Four questions answered  
**Primary CTA:** Refresh  
**Secondary:** View appointment  
**States:** Per status; loading; refresh error; booked-not-in-queue  
**Validation:** None  
**Responsive behavior:** Position is the visual hero on mobile  
**Accessibility considerations:** Live region on refresh; wait disclaimer always present  
**Next screens:** P11  

---

## Screen: Staff sign in (S01)

**Purpose:** Access dashboard  
**User:** Receptionist, Doctor, Admin  
**Layout hierarchy:** Clinic/product; identifier; password; Sign in  
**Primary CTA:** Sign in  
**States:** Default; submitting; invalid; network  
**Next screens:** S02  

---

## Screen: Today (S02)

**Purpose:** Day snapshot  
**Layout hierarchy:** 1. Date 2. Count row 3. Next arrivals or waiting 4. Shortcuts  
**Required content:** Counts for booked / waiting / called / completed; not charts  
**Primary CTA:** Open queue or find patient  
**States:** Loading; empty day; error  
**Responsive behavior:** Counts wrap; lists become cards on mobile  
**Next screens:** S03, S05  

---

## Screen: Appointments (S03)

**Purpose:** Find + check in  
**Layout hierarchy:** Search; filters; list/table  
**Required content:** Name, time, doctor, status, reference  
**Primary CTA:** Open row  
**Secondary:** Check in on Booked rows  
**States:** Loading; empty; no results; error  
**Responsive behavior:** Table → cards  
**Next screens:** S04  

---

## Screen: Appointment detail staff (S04)

**Purpose:** Identity + status action  
**Layout hierarchy:** Identity; booking; status; primary action  
**Primary CTA:** Check in / Call / Complete (permission)  
**States:** Per status; saving; error; success toast  
**Next screens:** S05, S03  

---

## Screen: Live queue (S05)

**Purpose:** Run the line  
**Layout hierarchy:** 1. Waiting list ordered 2. Called slot 3. Optional checked-in bucket if not auto-waiting  
**Required content:** Position, name, doctor, actions  
**Primary CTA:** Call patient  
**Secondary:** Complete; open detail  
**States:** Empty; loading; error; outdated  
**Responsive behavior:** Cards + sticky Call on mobile; table + panel on desktop  
**Next screens:** S06, S04  

---

## Screen: Queue patient panel (S06) — P1

**Purpose:** Confirm before Call/Complete  
**Layout hierarchy:** Name; reference; actions  
**Primary CTA:** Context action  
**Next screens:** S05  

---

## Screen: Unauthorized / session (S07) — P1

**Purpose:** Recover access  
**Primary CTA:** Sign in  
**Next screens:** S01  

---

## Screen: Account (S08) — P1

**Purpose:** Role visibility + sign out  
**Primary CTA:** Sign out  
**Next screens:** S01  

---

# 24. Component requirements

Do not design visuals here. Variants are behavioural.

### Navigation

| Component | Variants |
| --------- | -------- |
| Patient header | Default; compact |
| Patient menu | Open/closed (mobile) |
| Staff sidebar | Expanded; collapsed; mobile hidden |
| Staff mobile nav | Today / Appointments / Queue |
| Step indicator | 5 steps booking (P1) |
| Breadcrumb | Staff detail only if needed (optional P2) |

### Forms

| Component | Variants |
| --------- | -------- |
| Text input | Default, focus, error, disabled, filled |
| Phone input | Default, error, prefix +233/0 |
| Select | Default, open, disabled |
| Date picker | Day enabled/disabled, selected |
| Time slot | Available, selected, unavailable (hidden or disabled) |
| Search | Default, searching, with clear |
| Radio / list select | Doctor cards |
| Button | Primary, secondary, destructive, loading, disabled, full-width mobile |
| Checkbox | Only if SMS consent tick is required (Open decision) |

### Healthcare / appointment

| Component | Variants |
| --------- | -------- |
| Appointment card | Patient; staff row/card |
| Appointment status | Booked, Checked In, Waiting, Called, Completed, Cancelled |
| Queue position | Large patient; small staff |
| Wait estimate | With disclaimer |
| Doctor info | List item; summary chip |
| Appointment reference | Display + copy |

### Staff dashboard

| Component | Variants |
| --------- | -------- |
| Data table | Default, empty, loading |
| Patient/appointment row | + Check in action |
| Queue item | Waiting, Called, selected |
| Dashboard metric | Count only |
| Filter | Status, doctor |
| Staff search | As above |

### Feedback

| Component | Variants |
| --------- | -------- |
| Alert | Info, error, warning (in-page) |
| Toast | Success, error (staff) |
| Modal / sheet | Cancel confirm; optional check-in confirm |
| Loading | Page, inline, button |
| Empty | Illustrated optional P2 — prefer text-only for connectivity |
| Error | Field, page, banner |

---

# 25. Prototype requirements

Minimum clickable flows for demo (aligns with Gate 5: web booking + SMS story + staff dashboard + queue check).

### Patient

1. **Book appointment**  
   Home → Details → Doctor → Date → Time → Review → Confirmed → Details  
   Also: Review → Slot taken → Time  

2. **Find appointment**  
   Home → Find → Details  

3. **Reschedule**  
   Details → Date → Time → Review → Updated → Details  

4. **Cancel**  
   Details → Confirm → Cancelled  

5. **View queue position**  
   Details (Waiting) → Queue status (position + wait + disclaimer)  
   Also: Booked details → Queue explains not in line yet  
   Also: Called / Completed variants  

### Staff

1. **Login** → Today  
2. **View appointments** → list  
3. **Check in** → list or detail → toast → status change  
4. **View queue** → waiting list  
5. **Call patient** → Called  
6. **Complete** → Completed  

Connect success/error states at least for booking clash, lookup miss, and empty queue.

---

# 26. Developer handoff requirements (eventual Figma file)

For React implementation, the Figma file must eventually include:

- Design tokens (colour, type, space, radius) — **chosen in visual design step, not this spec**  
- Typography scale and colour roles (semantic: text, surface, status, danger)  
- Spacing system  
- Components + variants matching §24  
- Responsive frames: patient 360 / 768 / 1280; staff 768 / 1280 / 1440  
- All P0 screens + P1 listed  
- Interaction states: hover/focus/disabled/loading/error/success  
- Form validation examples  
- Accessibility annotations (focus order, contrast, labels)  
- Queue status set as a component  
- Navigation for both apps  
- Prototype flows in §25  

Architecture implication: one component library; two layout shells (`PatientLayout`, `StaffLayout`). Status and appointment cards shared.

---

# 27. UX risks

| Risk | Why it matters | Mitigation |
| ---- | -------------- | ---------- |
| Patients think queue position is their appointment time | They arrive wrong or panic | Separate labels; Booked state says “not in queue yet” |
| Patients treat wait estimate as exact | Clinic trust; complaints | “Guide only”; simple average; no fake precision (no 12.4 min) |
| Duplicate bookings / double submit | Clash; two SMS | Disable button; DB constraint; P08 recovery |
| Duplicate appointments same day | Congestion | **Open decision** to warn; do not silently block unless product says |
| Form data lost on poor network | Abandonment | Persist fields in session; retry |
| Staff wrong status click | Queue chaos | Confirm Call/Complete if needed; undo **not in MVP** — make labels explicit |
| SMS assumed = booking | User thinks failure when sandbox delays | Web reference is source of truth |
| Too many booking steps | Drop-off | Cap at 5 patient steps; combine date/time on desktop |
| Walk-in not in system | Paper returns | Open decision on staff-create appointment |
| Narrative vs MVP SMS channel | Stakeholders expect SMS booking | This spec; Figma must not draw USSD/SMS bots |
| Partner clinic name missing | Generic design | Use placeholder “[Clinic name]”; replace when confirmed |
| Checked In vs Waiting unclear | Position missing | Copy + open decision on auto-transition |
| Doctor vs all-doctors view | Privacy / overload | Permission TBD; default UX can filter “my patients” as option not requirement |

---

# 28. Assumptions

1. Single partner clinic (no clinic picker).  
2. No patient passwords; lookup = phone + reference.  
3. Registration = patient record during booking, not a separate membership product.  
4. Doctor list is required because schedules are per doctor.  
5. Service/specialty is a subtitle, not its own step.  
6. Ghana phone numbers.  
7. UI language is English.  
8. Staff auth is email/username + password; accounts are seeded.  
9. Cancel/reschedule only while Booked.  
10. Wait = people ahead × configured average minutes.  
11. Successful reschedule sends an SMS update.  
12. Check-in is receptionist-primary.  
13. Appointment reference is short and human-readable.  
14. Patient web and staff web share a design system but not a nav.  
15. Walk-in handling is not a separate module until product decides.  
16. No email to patients in MVP.  
17. Reminder timing (e.g. morning of) is backend config, not a patient setting.  
18. Placeholder clinic/doctor data is acceptable until the partner supplies real data.

---

# 29. Open product decisions

1. Official partner clinic name.  
2. Patient accounts/passwords vs lookup-only.  
3. Lookup keys (phone+reference vs phone+DOB vs reference-only).  
4. Reference format.  
5. Service-first vs doctor-first.  
6. Slot duration and clinic hours.  
7. Average minutes used in wait copy.  
8. Auto move Checked In → Waiting vs extra click.  
9. Who may Call and Complete (receptionist vs doctor vs both).  
10. Who may check in.  
11. Admin powers beyond “basic access control”.  
12. Can staff create appointments / walk-ins?  
13. Can patients change appointments after check-in?  
14. SMS on cancel?  
15. Explicit SMS consent checkbox?  
16. Forgot password for staff?  
17. Resend confirmation SMS?  
18. Prevent two active bookings per patient?  
19. Doctor sees all patients or only own?  
20. Queue polling interval vs manual refresh only.  
21. Exact reminder send time.  
22. SMS provider (Africa’s Talking vs Hubtel) — Week 1 verification, not UX.  
23. Whether “Check my queue” is a third home CTA or only via Find.

---

# 30. YɛnCare UX Blueprint (concise)

1. **Product:** Clinic appointment + virtual queue for one Ghana partner clinic. Web for actions; SMS for confirmation + one reminder. Differentiator: real queue + low-connectivity honesty — not a generic CRUD booking form.  
2. **Users:** Patient; Receptionist; Doctor; Admin.  
3. **IA:** Patient: Home, Book, Find, Queue. Staff: Today, Appointments, Queue, Account.  
4. **Nav:** Task-based patients; operational staff. No analytics.  
5. **Screens:** P01–P18 patient; S01–S08 staff; globals.  
6. **Patient journey:** Home → book 5 steps → confirm → later find → manage → queue after check-in.  
7. **Staff journey:** Login → today → find → check in → queue → call → complete.  
8. **Booking:** Name/phone → doctor → date → time → review → reference + SMS caveat.  
9. **Manage:** Lookup; cancel with confirm; reschedule with clash handling.  
10. **Queue:** Booked → Checked In → Waiting → Called → Completed; position + rough average wait.  
11. **Roles:** Basic; many permissions TBD.  
12. **Responsive:** Patient mobile-first; staff desktop-first.  
13. **Low connectivity:** Retry, preserve forms, no offline sync.  
14. **SMS:** Async proof; web is source of truth.  
15. **States:** Loading/empty/error/success as matrix.  
16. **A11y:** WCAG 2.2 AA practical; status not colour-only.  
17. **Copy:** Plain English; wait is a guide; no medical claims.  
18. **Components:** Nav, forms, appointment/queue, staff table, feedback.  
19. **Prototype:** Five patient + six staff flows.  
20. **Boundary:** No USSD, SMS booking, offline sync, analytics, audit, auto-reschedule.  
21. **Risks:** Queue vs time confusion; SMS ≠ booking; double submit.  
22. **Assumptions:** Listed in §28.  
23. **Open decisions:** Listed in §29.

---

*End of UX architecture specification. Visual UI is the next step (Figma Agent).*
