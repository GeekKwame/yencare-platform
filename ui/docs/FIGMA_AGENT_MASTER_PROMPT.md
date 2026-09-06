# FIGMA AGENT MASTER PROMPT — YɛnCare MVP

Copy everything below the line into Figma Agent.

---

You are a UI/UX designer working in Figma. Produce **wireframes first**, then a simple design system, then high-fidelity UI, reusable components, responsive layouts, and a clickable prototype.

Do not invent product features. Follow this brief exactly.

---

## 1. What YɛnCare is

YɛnCare is a clinic appointment and queue system for **one partner clinic in Ghana**.

Tagline: **Healthcare access, wherever you are.**

It is not a hospital marketplace, not an EMR, not a telemedicine app, not a payments app, and not a USSD product.

Core idea: a patient books on the **web**, gets proof via **SMS confirmation + one reminder**, and can see a **real virtual queue** (position + rough wait), while **staff** run the day from one dashboard (bookings, check-in, live queue).

Differentiator: low-connectivity-friendly web + real queue. Not “just a booking form”.

---

## 2. Who it is for

**Patient** — books, finds, reschedules, cancels, checks queue. Mixed technical comfort. May have poor internet. Mobile-first.

**Receptionist** — finds patients, checks them in, runs the queue. Desktop-first.

**Doctor** — sees who is waiting/called, completes visits (exact buttons may appear on queue; do not invent extra doctor-only apps).

**Admin** — same staff shell with a visible role label. Do not design user-admin, analytics, or audit screens.

---

## 3. What the MVP includes (design only these)

- Patient web: registration (name + phone), booking, lookup, cancel, reschedule, queue position, rough wait
- SMS: mentioned in the web UI (confirmation + one reminder). Do **not** design SMS screens, chat, or USSD menus
- Staff web: login, today dashboard, appointment list, appointment detail, check-in action, live queue, status changes
- Queue lifecycle only: **Booked → Checked In → Waiting → Called → Completed**
- Plus appointment outcome: **Cancelled**
- Booking clash: “this time was taken” recovery screen
- Basic roles shown in the staff header (name + role)

---

## 4. What NOT to design

Do not draw:

- USSD flows or feature-phone dial screens
- SMS inbox / message composer / delivery tracking / resend console
- Offline-sync indicators, pending-outbox, conflict merge
- Automatic rescheduling engine
- Analytics dashboards, charts, busiest-hours
- Audit logs
- Payments, medical records, prescriptions, lab results
- Multi-clinic picker or maps
- Patient password account, profile settings, email inbox
- Staff user-management admin
- Dark marketing illustrations, stock-photo heroes, gamification, AI branding

If a screen is not in the inventory below, do not add it.

---

## 5. Design principles (obey all)

1. One job per screen (especially patient mobile).
2. Show only what is needed to book, find, or run the queue.
3. After booking, the **appointment reference** is the most important visual object.
4. Queue must answer in 5 seconds: Where am I? How long might I wait? What is happening? What should I do next?
5. Wait time is always a **rough guide**, never exact. No fake decimals.
6. Booking success does **not** depend on SMS arriving. Say that on the confirmation screen.
7. Light UI, almost no animation, obvious loading and retry. Preserve form data conceptually (show filled fields on error).
8. Patient = mobile-first. Staff = desktop-first but responsive.
9. Staff: fewest clicks from search → check-in → call → complete.
10. Calm healthcare UI. Status is **text + icon/shape**, never colour-only.
11. Plain English for Ghanaian users. No medical claims. Product name is **YɛnCare**.
12. English UI only.

Placeholder clinic name: **[Partner clinic]** until replaced.

---

## 6. Information architecture

### Patient app (no account menu)

```
Home
  Book appointment
    Your details → Choose doctor → Choose date → Choose time → Review → Confirmed
  Find appointment
    Search → Appointment details → Reschedule OR Cancel
  Queue status (from details, or Home “Check my queue” which uses the same lookup)
```

Header: YɛnCare | Book appointment | Find appointment

### Staff app (after login)

```
Today | Appointments | Queue
Account: name, role, Sign out
```

No Patients CRM section. Search lives on Appointments.

---

## 7. Patient booking rules

Order (do not reshuffle):

1. Your details — Full name, Ghana phone. Copy: used to send a confirmation text.
2. Choose who you will see — list of doctors; service/specialty as subtitle only. One clinic, no clinic picker.
3. Choose date — only days with slots enabled.
4. Choose time — only open times.
5. Review — name, phone, doctor, date, time, SMS sentence.
6. Confirmed — big reference, facts, SMS caveat.

On desktop, date + time may be one frame. On mobile, two frames.

If the slot is taken: dedicated recovery → back to times.

No password. No email field.

---

## 8. Lookup / cancel / reschedule

**Find:** Phone + appointment reference. Helper: “Your reference is on the confirmation screen and in the text message.”

**Cancel:** Only from **Booked**. Confirm sheet: date/time + “this time will be given to someone else”. Success: cancelled + Book a new appointment.

**Reschedule:** Only from **Booked**. Same date/time pickers. Review old vs new. Success: new time + “we will text this number”.

After check-in, hide cancel/reschedule.

---

## 9. Queue UI (conceptual — most important differentiator)

Do not design charts or prediction graphs.

**Booked:** “You are not in the queue yet.” Instruction: come to clinic, check in at reception. Show appointment time labelled **Appointment time** (not queue).

**Checked In:** “Reception has checked you in. Please wait to be called.”

**Waiting:** Huge **You are number N in the queue.** Then: “Typical wait from here is about X minutes. This is only a guide. Stay nearby.”

**Called:** “It is your turn. Please go in to see [Doctor].” Hide position and wait.

**Completed:** “Your visit is finished.”

**Cancelled:** “This appointment was cancelled.”

Always separate **Appointment time** from **Place in the queue**.

Staff queue: ordered list with position, name, time, doctor, status, actions Check in / Call patient / Complete visit depending on status.

---

## 10. Staff dashboard

Operational, not decorative.

**Today:** today’s date; counts only (Appointments today, Not arrived, Waiting, Called, Completed); short list of next arrivals; buttons Open queue, Find appointment. No charts.

**Appointments:** search (name, phone, reference); status filter; list/table; Check in on Booked rows.

**Appointment detail:** identity + booking + status + primary action.

**Queue:** waiting list + called highlight + empty “No patients in the queue”.

---

## 11. Screens to create

Create these frames. Include listed states as separate frames or component variants.

### Patient — mobile (360) AND tablet/desktop (768 / 1280) for P0

| ID | Screen | Required states |
| -- | ------ | --------------- |
| P01 | Home | default |
| P02 | Your details | default, error, loading |
| P03 | Choose doctor | default, loading, empty |
| P04 | Choose date | default, loading, no dates |
| P05 | Choose time | default, loading, no times |
| P06 | Review booking | default, submitting |
| P07 | Booking confirmed | success |
| P08 | Slot no longer available | default |
| P09 | Find appointment | default, searching, field error, not found, network error |
| P11 | Appointment details | Booked, Checked In, Waiting, Called, Completed, Cancelled |
| P12 | Cancel confirm | default, submitting |
| P13 | Appointment cancelled | success |
| P14 | Reschedule date | default |
| P15 | Reschedule time | default, empty |
| P16 | Reschedule review | default, submitting |
| P17 | Appointment updated | success |
| P18 | Queue status | Booked (not in queue), Checked In, Waiting (hero position), Called, Completed, loading, refresh error |
| G01 | Network error with Retry | global patient |

### Staff — desktop (1280) AND tablet (768); one mobile (390) pass for Today, Appointments, Queue

| ID | Screen | Required states |
| -- | ------ | --------------- |
| S01 | Sign in | default, error, submitting |
| S02 | Today | default, empty day, loading |
| S03 | Appointments | list, empty, no search results, loading |
| S04 | Appointment detail | Booked (Check in), Checked In, Waiting, Called (Complete), Completed |
| S05 | Live queue | waiting list, empty, loading |
| S06 | Queue patient panel | desktop overlay / mobile full screen |
| S07 | Session expired / unauthorized | default |
| S08 | Account (name, role, Sign out) | default |

---

## 12. How screens connect (prototype)

Wire these clicks:

**Patient book**
P01 → P02 → P03 → P04 → P05 → P06 → P07 → P11
P06 → P08 → P05 (clash)

**Patient find / manage**
P01 → P09 → P11
P09 → not found state
P11 Booked → P12 → P13 → P01 or P02
P11 Booked → P14 → P15 → P16 → P17 → P11
P11 Waiting → P18
P01 Check my queue → P09 → P11 or P18

**Staff**
S01 → S02 → S03 → S04 (Check in) → S05 → Call → Called → Complete
S02 → S05
S08 Sign out → S01

---

## 13. Copy to put on the wireframes (use verbatim)

**CTAs:** Book appointment · Continue · Confirm booking · Find appointment · Cancel appointment · Yes, cancel appointment · Keep appointment · Change appointment time · Confirm new time · Check my queue · Refresh · Check in · Call patient · Complete visit · Sign in · Try again

**Home SMS note:** We send a confirmation text after you book.

**Review:** We will send a confirmation text to this number.

**Confirmed:**
Your appointment is booked.
Reference: YC-4821
We sent a confirmation text to 024 XXX 4567. If the text does not arrive, your booking is still saved. Show this reference at the clinic.

**Wait:** Typical wait from here is about 40 minutes. This is a rough guide, not an exact time.

**Waiting instruction:** Stay nearby. We will call you when it is your turn.

**Clash:** This time was just taken. Please choose another time.

**Lookup miss:** We could not find an appointment with those details.

**Network:** No internet. Check your connection and try again.

**Staff empty queue:** No patients in the queue.

**Check-in toast:** Ama Mensah is checked in.

Do not use lorem ipsum for primary screens. Use this copy.

Sample data:
- Patient: Ama Mensah · 024 123 4567 · YC-4821
- Doctor: Dr. Kwame Boateng · General clinic
- Appointment: Tuesday 15 September 2026, 10:00
- Queue: You are number 4 · about 40 minutes

---

## 14. Responsive behaviour to design

**Patient**
- One column forms
- Full-width primary buttons on mobile
- Header: logo + 2 links or a simple menu
- Queue position is the largest number on the page
- Cancel confirm = full-screen sheet on mobile, dialog on desktop
- Doctor list = stacked cards; 2 columns on tablet+

**Staff**
- Sidebar on desktop: Today, Appointments, Queue
- Hamburger or bottom nav on mobile
- Tables become cards under ~768
- Queue: list + detail panel on desktop; stacked cards on mobile
- Dashboard counts wrap; never become charts

Touch targets ≥ 44px. Form width on desktop ~480–560px for patient flows.

---

## 15. Accessibility to annotate

WCAG 2.2 AA practical:

- Visible labels (not placeholder-only)
- Visible focus
- Text errors next to fields
- Status as text, not colour alone
- Queue number readable by screen reader (“You are number 4 in the queue”)
- Page title per frame
- Contrast AA
- No essential info only in colour or animation

---

## 16. Low-connectivity (visualise in UI)

On every important fetch/submit, design:

- Loading text or simple skeleton (no shimmer spectacle)
- Error banner + Try again
- Submitting buttons: disabled + “Booking…” / “Searching…” / “Cancelling…”
- Queue: Refresh + “Updated [time]”

Do not design offline mode, cached staff editing, or sync queues.

---

## 17. Components to build in the design system

Build as reusable Figma components with variants:

**Nav:** Patient header, patient mobile menu, staff sidebar, staff mobile nav, optional 5-step booking indicator

**Forms:** Input (default/focus/error/disabled/filled), phone input, search, date picker states, time slot (available/selected), doctor-select card, button (primary/secondary/destructive/loading/disabled)

**Appointment:** Appointment card, status badge (6 statuses + Cancelled), reference block, doctor summary, wait estimate + disclaimer, queue position (patient large / staff small)

**Staff:** Metric count, data table, appointment row, queue item, filters

**Feedback:** Alert, toast, modal/sheet, empty state (text), page error, inline loading

Then assemble screens from these components.

---

## 18. Figma file structure

Pages:

1. Cover
2. Design system / components
3. Patient wireframes
4. Staff wireframes
5. Patient hi-fi (after wireframes approved)
6. Staff hi-fi
7. Prototype (flows in section 12)
8. Handoff — notes for React

Frames named with IDs: `P01 Home`, `P18 Queue Waiting`, `S05 Queue Empty`, etc.

---

## 19. Process order (do this in sequence)

**Step A — Wireframes only**
Low-fidelity, grayscale, real copy, all P0 frames + key states. No colour system yet, no illustrations.

**Step B — Design system**
Tokens, type, colour roles, components with variants. Calm, clinical, high contrast, suitable for Ghana clinic use. Do not copy a US hospital marketplace look.

**Step C — High-fidelity**
Apply system to all P0 and P1 screens. Responsive sets.

**Step D — Prototype**
Connect the flows in section 12.

**Step E — Handoff**
Component descriptions, spacing, states, accessibility notes for React.

Start with Step A in this session unless asked otherwise.

---

## 20. Assumptions already decided for design (do not reopen in the UI)

- One clinic, no clinic selector
- No patient login/password
- Lookup = phone + reference
- Doctor step exists; service is subtitle
- English only
- Cancel/reschedule only while Booked
- SMS UI is not a product surface
- Wait copy uses a simple average (show “about 40 minutes” as example)

If something is missing, keep the screen simpler rather than adding a feature.

---

End of brief. Begin with **Step A: complete patient + staff wireframes** using the screen table and copy above.
