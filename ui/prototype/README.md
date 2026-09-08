# YɛnCare Interactive Clinical Prototype (`ui/prototype/`)

> **Production-Grade Clinical Simulation Hub for KNUST University Health Services · Students' Clinic**  
> Built with **React 19**, **TypeScript**, **Vite 8**, and **TailwindCSS v4**.

---

## 1. Quickstart

### Running the Application
```bash
# Option 1: From this directory
npm install
npm run dev

# Option 2: From project root
npm run dev
```

Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

> [!NOTE]
> Student Home does **not** start signed in as a named patient. To test, book a new visit (generating a unique `YC-XXXX` reference) or use **Find appointment** (`P09`) against the seeded roster. Sample names on the roster (e.g. Akosua Boateng) represent today's clinic schedule for staff screens.

---

## 2. Directory Structure

```text
ui/prototype/
├── index.html               # Entry HTML (Hanken Grotesk font & Material Symbols)
├── package.json             # Prototype dependencies and build scripts
├── tsconfig.json            # Strict TypeScript configuration
├── vite.config.ts           # Vite + TailwindCSS v4 configuration
└── src/
    ├── App.tsx              # Shell router (Student Web vs Staff Operations Portal)
    ├── main.tsx             # Application mount & React strict root
    ├── index.css            # Clinical Brutalism design tokens & TailwindCSS v4 styles
    │
    ├── types/
    │   ├── clinic.ts        # TypeScript models, enums & state definitions
    │   └── index.ts         # Barrel export
    │
    ├── context/
    │   ├── ClinicContext.tsx # Centralized state machine, mock appointments, SMS logs & scenario handlers
    │   └── index.ts         # Barrel export & useClinic hook
    │
    └── components/
        ├── common/          # Reusable design system primitives
        │   ├── Button.tsx             # Clinical buttons (primary, secondary, accent, danger)
        │   ├── ConnectivityBanner.tsx # Multi-state network status bar (poor/offline/restored)
        │   ├── GhanaPhoneInput.tsx    # Ghana (+233) formatted telephone input
        │   ├── ProtoToolbar.tsx       # Prototype scenario simulator & screen switcher
        │   ├── ReferenceBlock.tsx     # High-visibility speakable reference code (YC-4821)
        │   ├── SmsModal.tsx           # Simulated SMS notification message viewer
        │   ├── StatusBadge.tsx        # Color-coded clinical status badges
        │   ├── Toast.tsx              # Ephemeral feedback alerts
        │   ├── YenCareLogo.tsx        # Official brand logo component
        │   └── index.ts               # Barrel export
        │
        ├── patient/         # Student web experience screens (19 screens)
        │   ├── PatientHeader.tsx          # University Health Services header bar
        │   ├── P01Home.tsx                # Welcome landing & live queue overview
        │   ├── P02YourDetails.tsx         # Student details (Index Number & Phone - Step 1/6)
        │   ├── P02BClinicSite.tsx         # Clinic site selection (Students' Clinic / Social Sci - Step 2/6)
        │   ├── P02CVisitType.tsx          # Visit type selection & emergency safety gate (Step 3/6)
        │   ├── P03ChooseDoctor.tsx        # Attending clinician & room selector (Step 4/6)
        │   ├── P04P05DateTime.tsx         # Date & slot picker with arrive-by time (Step 5/6)
        │   ├── P06ReviewBooking.tsx       # Comprehensive booking review (Step 6/6)
        │   ├── P07BookingConfirmed.tsx    # Booking confirmation + SMS delivery simulation
        │   ├── P08SlotTaken.tsx           # Slot clash recovery state
        │   ├── P09FindAppointment.tsx     # Tabbed lookup (Student Index, Reference, or Phone)
        │   ├── P10ClinicActivity.tsx      # Real-time clinic intelligence, queue demand & wait advisory
        │   ├── P11AppointmentDetail.tsx   # Appointment detail & staff change alert
        │   ├── P12CancelConfirm.tsx       # Cancellation prompt
        │   ├── P13AppointmentCancelled.tsx# Cancellation confirmation
        │   ├── P14P17RescheduleFlow.tsx   # 3-step student reschedule flow (P14, P15, P16, P17)
        │   ├── P18QueueStatus.tsx         # 5-stage live virtual queue tracker & room assignment
        │   ├── P19AfterHours.tsx          # Clinic closed state with KNUST Hospital guidance
        │   └── index.ts                   # Barrel export
        │
        ├── staff/           # Clinical staff workstation portal (11 screens)
        │   ├── StaffLayout.tsx            # Staff workstation shell with role switcher & nav
        │   ├── S01SignIn.tsx              # Fast demo authentication (Receptionist / Doctor / Admin)
        │   ├── S02Today.tsx               # Today's operational dashboard with brutalist metrics
        │   ├── S03Appointments.tsx        # Appointments roster with walk-in / no-show filters
        │   ├── S04PatientDetail.tsx       # Clinical check-in, student record & multi-room dispatch
        │   ├── S05LiveQueue.tsx           # Live queue board for Room 1 & Room 2
        │   ├── S05EmptyQueue.tsx          # Clean empty queue state
        │   ├── S06AddWalkIn.tsx           # Reception walk-in registration (W-024 token)
        │   ├── S07SessionExpired.tsx      # Workstation security timeout
        │   ├── S08ChangeAppointment.tsx   # Staff-initiated appointment reschedule with reason
        │   ├── S09NoShowConfirm.tsx       # No-show confirmation and slot release
        │   ├── S10DisplayBoard.tsx        # Public waiting room TV display board for tokens
        │   └── index.ts                   # Barrel export
        │
        └── edge/            # Network resilience & recovery
            ├── G01NetworkError.tsx        # Offline recovery view with cached reference display
            └── index.ts                   # Barrel export
```

---

## 3. Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Launch local Vite dev server with Hot Module Replacement |
| `npm run build` | Compile TypeScript and build production bundle into `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run format` | Run code formatter (`oxfmt`) |

---

## 4. Prototype Testing & Scenario Simulator (`ProtoToolbar`)

A non-intrusive floating controller at the bottom-right allows complete scenario testing:
- **Session Progressor**: Step an active patient session through `BOOKED` &rarr; `CHECKED_IN` &rarr; `WAITING` &rarr; `CALLED (Room 1/2)` &rarr; `COMPLETED`.
- **Scenario Triggers**:
  - `+ Simulate Walk-in (W-024)`: Injects an unscheduled walk-in student into the live queue.
  - `Mark YC-4822 No-Show`: Tests slot release for a seeded roster appointment.
  - `Staff Change current to 10:30`: Reschedules the focused student session and shows the student alert.
  - `Toggle After-Hours (P19)`: Toggles clinic closed mode.
  - `Network State Selector`: Test `online`, `poor`, `offline`, and `restored` states.
- **All Screens Grid**: One-click jump to all 19 patient screens and 11 staff screens.
