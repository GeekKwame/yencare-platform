# YɛnCare — Production Healthcare Platform

> **Healthcare access, wherever you are. Ghana.**  
> Outpatient clinic appointment scheduling and live virtual queue management for KNUST University Health Services / Students' Clinic.

---

## Overview

**YɛnCare** is an outpatient healthcare platform designed for campus and regional healthcare clinics across Ghana, centered on the **KNUST University Health Services · Students' Clinic** and **Social Science Block GF7**. It replaces crowded waiting corridors with structured appointment scheduling, speakable booking references (`YC-4821`), and real-time live virtual queue monitoring.

### Core Value Propositions
- **No Password Barrier**: Students book with their Full Name, Student Index Number, and Ghana phone number (`+233`), and manage bookings via phone + speakable reference code.
- **Speakable Reference Codes**: Memorable reference codes (`YC-4821`) designed for oral verification at reception desks and via SMS.
- **Virtual Waiting & Nearby Freedom**: Students monitor their live position (`#4`), estimated wait time (`~20 min`), and assigned room (`Room 1` or `Room 2`) from anywhere on campus.
- **Unified Clinical Operations**: Reception check-in, doctor room assignment, unscheduled walk-in registration, and no-show handling in a single operational dashboard.
- **Clinical Brutalism Identity**: High-contrast, structured editorial minimalism featuring a calm healthcare palette (`#111111`, `#F7F8F7`, `#087F6C`, `#E7F5F1`), crisp typography, and accessible design.

---

## Repository Structure

```
yencare-platform/
├── package.json              # Root proxy scripts (npm run dev, npm run build)
├── .gitignore                # Recursive ignore for dependencies & build artifacts
├── README.md                 # Project executive overview & developer guide
│
├── backend/                  # Express API (patients) + MongoDB + SMS wrapper
│   ├── README.md             # Patient endpoints, MongoDB, sendSms
│   ├── src/server.js         # API entry
│   ├── src/models/Patient.js # Mongoose Patient schema
│   └── src/sms/sendSms.js    # Reusable sendSms(to, message) for Able & Emmanuella
│
└── ui/                       # Consolidated UI & Frontend Hub
    ├── README.md             # UI directory overview & guide
    │
    ├── docs/                 # Product specifications, architecture & design locks
    │   ├── ARCHITECTURE.md                 # Full technical architecture & state rules
    │   ├── STITCH_DESIGN_LOCK.md           # Product lock & canonical design decisions
    │   ├── YENCARE_UX_ARCHITECTURE_SPEC.md # End-to-end UX journey specifications
    │   ├── FIGMA_AGENT_MASTER_PROMPT.md    # Design system prompts & token definitions
    │   ├── YenCare_Product4_ScopeSheet_Gate1.docx
    │   └── YenCare_Week1_Pitch.pdf
    │
    ├── prototype/            # Active React 19 + TypeScript + Vite Interactive Web Prototype
    │   ├── package.json      # Prototype dependencies & build scripts
    │   ├── README.md         # Detailed prototype documentation
    │   ├── vite.config.ts    # Vite + TailwindCSS v4 configuration
    │   ├── tsconfig.json     # TypeScript configuration
    │   ├── index.html        # HTML entry point (Hanken Grotesk & Material Symbols)
    │   └── src/
    │       ├── App.tsx       # Shell router (Student Web vs Staff Operations Portal)
    │       ├── index.css     # Clinical Brutalism design system tokens & theme
    │       ├── main.tsx      # Application mount
    │       ├── context/      # State machine & data provider (ClinicContext)
    │       ├── types/        # TypeScript data models & enums
    │       └── components/
    │           ├── common/   # Primitives (Button, Badge, SmsModal, ConnectivityBanner, ProtoToolbar)
    │           ├── patient/  # Student booking & queue screens (P01–P19)
    │           ├── staff/    # Clinical operations workstation (S01–S09)
    │           └── edge/     # Edge recovery (G01 Network Error & offline cache)
    │
    └── wireframe/            # Stitch visual export reference frames (HTML & PNG guides)
        ├── README.md         # Wireframe usage guidelines
        └── [screen folders]  # Export frames for mobile and desktop screens
```

---

## Quickstart Guide

### Prerequisites
- Node.js 18+ or 20+
- npm 9+
- MongoDB for the API (Atlas `MONGODB_URI`, or `docker compose up -d` in `backend/`)

### Running the Application

You can start the web prototype directly from the repository root:

```bash
# Start the local development server (from repo root)
npm run dev
```

Alternatively, run from the prototype directory:
```bash
cd ui/prototype
npm install
npm run dev
```

Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Available Root Commands

| Command | Action |
|---|---|
| `npm run dev` | Launch local Vite dev server with Hot Module Replacement |
| `npm run build` | Compile TypeScript and build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run format` | Run code formatter |
| `npm run dev:api` | Launch the Express API (`backend`, default http://localhost:4000) |
| `npm run start:api` | Start the API without `--watch` |
| `npm run sms:test` | Send a mock (or sandbox) SMS via `backend` |
| `npm run test:sms` / `npm run test:backend` | Run backend tests (patients API + SMS) |

---

## Application Architecture

YɛnCare is organized into two primary user shells:

### 1. Student Web Experience (`Shell 1`)
- **P01 Home Dashboard**: Welcome landing, live queue summary card, and after-hours checking.
- **P02 Student Details (Step 1/6)**: Full Name, Student Index Number (`20612345`), optional NHIS number, and Ghana phone number with `+233`.
- **P02B Clinic Site (Step 2/6)**: Choose between **Students' Clinic (Main Campus)** and **Social Science Block GF7**.
- **P02C Visit Type & Emergency Gate (Step 3/6)**: Select General OPD, Review, Dressing, or Other; emergency symptoms trigger an immediate safety redirect to emergency services.
- **P03 Attending Clinician (Step 4/6)**: Attending doctor selection (**Dr. Kwame Boateng · Room 1** or **Dr. Ama Serwaa · Room 2**).
- **P04/P05 Date & Slot Time (Step 5/6)**: Date selection and 30-minute consultation slot with **"Arrive by XX:XX"** guidance.
- **P06 Review Booking (Step 6/6)**: Key-value summary table of index number, site, visit type, and time before confirming.
- **P07 Booking Confirmed**: Confirmation card with speakable reference code **`YC-4821`**, arrive-by advisory, and simulated SMS message viewer.
- **P08 Slot Taken**: Conflict recovery screen offering alternative available slots.
- **P09 Find Appointment**: Tabbed search by Student Index Number, YC Reference, or Phone number.
- **P11 Appointment Details**: Student management hub with status badge, staff reschedule alerts, and SMS history.
- **P12/P13 Cancel Flow**: Confirmation prompt and slot release confirmation.
- **P14–P17 Reschedule Flow**: 3-step date & time selection, comparison review, and updated confirmation.
- **P18 Live Virtual Queue Status**: 5-stage lifecycle tracker (`Booked` &rarr; `Checked in` &rarr; `In Queue` &rarr; `Called` &rarr; `Completed`), dynamic queue position (`#4`), estimated wait, and room call notification.
- **P19 Clinic Closed (After-Hours)**: Clear closed notice with operating hours and urgent care guidance.

### 2. Staff Clinical Operations Portal (`Shell 2`)
- **S01 Sign In**: Fast 1-click demo role switching (`Receptionist`, `Doctor`, `Admin`).
- **S02 Today Operations**: Real-time operational dashboard with metrics (Total Patients, Waiting, In Consult, Completed, **Walk-Ins**, **No-Shows**) and active consultation room snapshots.
- **S03 Appointments Roster**: Searchable table by student index or name with status filters (including Walk-ins and No-shows) and quick check-in actions.
- **S04 Student Clinical Record**: Full clinical record with student index, NHIS, clinic site, and multi-room dispatch.
- **S05 Live Queue Board**: Live queue management for **Room 1** and **Room 2** with distinct `WALK-IN` and `BOOKED` badges.
- **S06 Register Walk-In**: Front-desk walk-in registration that generates `W-024` tokens and immediately queues students.
- **S08 Change Appointment**: Staff-initiated schedule change with required reason and student SMS alert.
- **S09 Mark No-Show**: Confirmation flow to release missed slots and update queue state.
- **S07 Session Expired**: Security timeout dialog with instant re-authentication.

---

## Prototype Testing & Scenario Simulator (`ProtoToolbar`)

A non-intrusive floating controller at the bottom-right allows complete scenario testing:
- **Session progressor**: After you **book** or **find** a student, step that session through `BOOKED` → `CHECKED_IN` → `WAITING` → `CALLED (Room 2)` → `COMPLETED`. The prototype does not start signed in as a named patient.
- **Scenario Triggers**:
  - `+ Simulate Walk-in (W-024)`: Injects an unscheduled walk-in student into the live queue.
  - `Mark YC-4822 No-Show`: Tests slot release for a seeded roster appointment.
  - `Staff Change current to 10:30`: Reschedules the focused student session and shows the student alert.
  - `Toggle After-Hours (P19)`: Toggles clinic closed mode.
  - `Network State Selector`: Test `online`, `poor`, `offline`, and `restored` states.
- **All Screens Grid**: One-click jump to all 17 patient screens and 10 staff screens.

---

## Backend API (patients)

`POST /api/patients` find-or-creates a student from prototype P02 (full name, 8-digit student index, Ghana phone, optional NHIS). `GET /api/patients/:identifier` looks up by index or phone. MongoDB `Patient` is the source of truth.

```bash
cd backend
copy .env.example .env
# Set MONGODB_URI, or: docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Health check: [http://localhost:4000/health](http://localhost:4000/health). Postman, curl, and status codes: [`backend/README.md`](./backend/README.md). Schema: [`backend/docs/DATABASE_ARCHITECTURE.md`](./backend/docs/DATABASE_ARCHITECTURE.md).

Frontend calls these routes when `VITE_API_BASE_URL=http://localhost:4000/api` ([`frontend/.env.example`](./frontend/.env.example), [`frontend/src/services/patients.js`](./frontend/src/services/patients.js)).

## SMS (backend)

Gate 2 confirmation texts go through one function: `sendSms(to, message)` in [`backend/src/sms/sendSms.js`](./backend/src/sms/sendSms.js). Able and Emmanuella should import that wrapper and not call mNotify or Africa's Talking from booking routes.

```js
import { sendSms } from './sms/sendSms.js';

const result = await sendSms(patient.phone, confirmationText);
if (!result.ok) {
  // Log and continue — the booking is still valid
}
```

| Mode | Cost | Where the message appears |
|---|---|---|
| `SMS_PROVIDER=mock` | Free | Terminal (`[SMS mock] to=+233…`) |
| `SMS_PROVIDER=mnotify` + API key | Signup bonus / paid credits | Real Ghana phone |
| `SMS_PROVIDER=africastalking` + sandbox key | Free | [Africa's Talking simulator](https://simulator.africastalking.com:1517/) inbox |

Sandbox messages **do not** reach a physical Ghana phone. The prototype **Simulated SMS** viewer (`SmsModal`) is a separate UI fake log and is not this module.

- Copy [`backend/.env.example`](./backend/.env.example) → `backend/.env` (gitignored). Never commit `MNOTIFY_API_KEY` or `AT_API_KEY`.
- Invalid numbers throw. Provider failures return `{ ok: false }` so booking can still succeed.
- Full contract, mNotify steps, and troubleshooting: [`backend/README.md`](./backend/README.md).

## Documentation Links

- UI Hub Overview: [`ui/README.md`](./ui/README.md)
- Interactive Prototype Documentation: [`ui/prototype/README.md`](./ui/prototype/README.md)
- Technical Architecture & State Model: [`ui/docs/ARCHITECTURE.md`](./ui/docs/ARCHITECTURE.md)
- Product Design Lock Decisions: [`ui/docs/STITCH_DESIGN_LOCK.md`](./ui/docs/STITCH_DESIGN_LOCK.md)
- Full UX Architecture Specifications: [`ui/docs/YENCARE_UX_ARCHITECTURE_SPEC.md`](./ui/docs/YENCARE_UX_ARCHITECTURE_SPEC.md)
- Visual Wireframe Guide: [`ui/wireframe/README.md`](./ui/wireframe/README.md)
- Backend API + SMS (`sendSms`): [`backend/README.md`](./backend/README.md)
- MongoDB schemas & indexes: [`backend/docs/DATABASE_ARCHITECTURE.md`](./backend/docs/DATABASE_ARCHITECTURE.md)