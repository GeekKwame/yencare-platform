# YɛnCare — Stitch design lock

**Audience:** Raymond (patient web), Harry (staff dashboard), Able (UI/UX)  
**Status:** Locked for implementation unless the product team changes a marked TBD  
**Sources:** Week 1 pitch, Gate 1 scope sheet, `docs/YENCARE_UX_ARCHITECTURE_SPEC.md`, Stitch export in `ui/`

Stitch output is a **visual reference**. Do not paste `code.html` into the React app. Rebuild as React components.

---

## 1. Product lock (do not reopen in UI)

| Rule | Decision |
| ---- | -------- |
| What we are building | One **React website**, two shells: patient + staff |
| What we are not building | Native iOS/Android app, USSD, SMS inbox |
| Patient viewport | Mobile **browser** first (~360px), then desktop |
| Staff viewport | Desktop first (~1280px) |
| Patient auth | No password. Lookup = phone + reference |
| Clinic | Single partner clinic. Name: **[Partner clinic]** until confirmed |
| Appointment reference | **`YC-4821`** style (prefix `YC-` + 4 digits). Speakable. Same everywhere |
| Sample patient | Ama Mensah · 024 123 4567 |
| Sample doctor | Dr. Kwame Boateng · General clinic |
| Sample slot | Tuesday 15 September 2026, 10:00 |
| Queue wait example | Number **4** · about **40 minutes** · always “rough guide” |
| Queue states | Booked → Checked In → Waiting → Called → Completed (+ Cancelled) |
| Staff roles shown | Receptionist, Doctor, Admin — not “Clinical Admin” |
| SMS | Mentioned on web only. Confirmation + one reminder. Web is source of truth |

---

## 2. Do not implement from Stitch

These appeared in frames and are **out of MVP** or **wrong**:

| Stitch invention | Why drop it |
| ---------------- | ----------- |
| Bottom tab bar (Book / Find) | Native-app chrome. Use a web header |
| Patient **Sign Out** | No patient account |
| Confirmation primary **Check my queue** | Status is Booked — they are not in the queue. Use **View appointment** |
| Korle-Bu, Room 102, Block A | Clinic is unnamed; do not invent a hospital |
| Reference codes `YN-842-A`, `YNC-A892`, tokens `A04` | Use `YC-4821` only |
| **+ New Appointment** | Walk-in create is TBD, not a named MVP feature |
| **No Show** | Not in the pitch queue lifecycle |
| Help Center, Privacy, Terms, Contact Support | Extra product surface |
| Pagination, 142 appointments, Dental/Eye | Inflated demo data; keep 4–8 realistic rows |
| Stitch `code.html` as production | Tailwind CDN snapshots, not our stack |

---

## 3. Canonical frames (build these)

Prefer `*_web_hi_fi` / `*_staff_hi_fi`. If hi-fi is missing, use the `_web` wireframe.

### Patient — implement

| ID | Canonical folder | Notes for React |
| -- | ---------------- | --------------- |
| P01 | `ui/p01_home_mobile_web_hi_fi` + `ui/p01_home_desktop_web_hi_fi` | Web header. Drop Sign Out on desktop. Drop footer legal links |
| P02 | `ui/p02_your_details_mobile_web_hi_fi` | Name + Ghana phone only |
| P03 | `ui/p03_choose_doctor_mobile_web_hi_fi` | One clinic; doctor + service subtitle |
| P04 | `ui/p04_choose_date_mobile_web_hi_fi` | |
| P05 | `ui/p05_choose_time_mobile_web_hi_fi` | |
| P04+P05 desktop | `ui/p04_05_date_time_desktop_web_hi_fi` | Combined date + time |
| P06 | `ui/p06_review_booking_mobile_web_hi_fi` | SMS sentence before submit |
| P07 | `ui/p07_booking_confirmed_mobile_web_hi_fi` | Big `YC-4821`. CTA: **View appointment** |
| P08 | `ui/p08_slot_taken_mobile_web_hi_fi` | |
| P09 | `ui/p09_find_appointment_mobile_web_hi_fi` | Phone + reference. Drop Contact Support |
| P11 | `ui/p11_appointment_details_mobile_web_hi_fi` | Booked: Reschedule + Cancel. Do not lead with Check my queue |
| P12 | `ui/p12_cancel_confirm_mobile_web_hi_fi` | |
| P13 | `ui/p13_appointment_cancelled_mobile_web_hi_fi` | |
| P18 | `ui/p18_queue_status_mobile_web` + desktop hi-fi | Waiting variant is good. Still need Booked / Called / Completed |
| G01 | `ui/g01_network_error_mobile` | Rebuild as web banner + Try again, not app chrome |

### Staff — implement

| ID | Canonical folder | Notes for React |
| -- | ---------------- | --------------- |
| S01 | `ui/s01_sign_in_desktop_staff` | No hi-fi yet — fine |
| S02 | `ui/s02_today_desktop_staff_hi_fi` | Counts only. Drop + New Appointment |
| S03 | `ui/s03_appointments_desktop_staff_hi_fi` | Search + Check in. Drop pagination if today-only |
| S05 | `ui/s05_live_queue_desktop_staff_hi_fi` | Call / Complete. Drop No Show and token IDs; use name + `YC-` |

Tokens / type: `ui/y_ncare_structured_wireframe/DESIGN.md`

---

## 4. Do not build these folders

**Native-app variants** (bottom nav, device chrome) — reference only, then ignore:

- `p01_home_mobile`
- `p02_your_details_mobile`
- `p03_choose_doctor_mobile`
- `p04_choose_date_mobile`
- `p05_choose_time_mobile`
- `p06_review_booking_mobile`
- `p07_booking_confirmed_mobile`
- `p08_slot_taken_mobile`
- `p09_find_appointment_mobile`
- `p11_appointment_details_mobile`
- `p12_cancel_confirm_mobile`
- `p13_appointment_cancelled_mobile`
- `p18_queue_status_mobile`

**Older wireframes** superseded by `*_hi_fi` (keep on disk if useful; do not implement both).

**Deleted from the repo copy:** nested `ui/stitch_figma_product_design_workflow/` (duplicate zip dump).

---

## 5. Still missing (P0 gaps)

Generate in Stitch later **or** implement from the UX spec without a frame:

| Gap | What to ship |
| --- | ------------ |
| P14–P17 Reschedule | Same as date → time → review; show old vs new time |
| P18 Booked | “You are not in the queue yet. Check in at reception.” |
| P18 Called | “It is your turn. Please go in to see Dr. Kwame Boateng.” |
| P18 Completed | “Your visit is finished.” |
| P10 Not found | State of P09 |
| S04 Appointment detail | Staff record + Check in / Call / Complete |
| S05 empty | “No patients in the queue.” |
| S07 Session expired | Supporting UX |

---

## 6. Who builds what

| Person | Build from |
| ------ | ---------- |
| Raymond | P01–P09, P11–P13, P18 (patient web) |
| Harry | S01–S03, S05, then S04 from spec |
| Shared | Status badge, reference block, buttons, Ghana phone field |

Gate 2 needs patient book + SMS confirmation end to end. Staff polish can follow, but do not wait for Figma credits.

---

## 7. Copy lock (use these CTAs)

Book appointment · Continue · Confirm booking · Find appointment · View appointment · Cancel appointment · Yes, cancel appointment · Keep appointment · Change appointment time · Confirm new time · Check my queue · Refresh · Check in · Call patient · Complete visit · Sign in · Try again
