# YɛnCare Interactive Web Prototype (`ui/prototype`)

This directory contains the production-grade React 19 + TypeScript + Vite web application for the **YɛnCare** clinic appointment scheduling and live virtual queue system, tailored for the **KNUST University Health Services · Students' Clinic**.

---

## Quickstart

```bash
# Option 1: From this directory
npm install
npm run dev

# Option 2: From project root
npm run dev
```

The application will be served locally at `http://localhost:5173/`.

Student Home does **not** start as a named patient. Book a new visit (new `YC-` reference) or **Find appointment** against today's seeded roster. Names on that roster, including Akosua Boateng, are sample clinic-day data for staff screens — not the signed-in student.

---

## Architecture & Directory Structure

```
ui/prototype/
├── index.html               # Entry HTML (Hanken Grotesk & Material Symbols)
├── package.json             # Dependencies and build scripts
├── tsconfig.json            # Strict TypeScript configuration
├── vite.config.ts           # Vite + TailwindCSS v4 configuration
└── src/
    ├── App.tsx              # Shell router (Student Web vs Staff Operations Portal)
    ├── main.tsx             # Application mount & React strict root
    ├── index.css            # Clinical Brutalism design tokens & TailwindCSS v4 styles
    │
    ├── types/
    │   ├── clinic.ts        # Core TypeScript data models, enums & state definitions
    │   └── index.ts         # Barrel export
    │
    ├── context/
    │   ├── ClinicContext.tsx # Centralized state machine, mock appointments, SMS logs & scenario handlers
    │   └── index.ts         # Barrel export & useClinic hook
    │
    └── components/
        ├── common/          # Reusable design system primitives
        │   ├── Button.tsx             # Clinical buttons (primary, secondary, accent, danger)
        │   ├── GhanaPhoneInput.tsx    # Ghana (+233) formatted telephone input
        │   ├── ReferenceBlock.tsx     # High-visibility speakable reference code (YC-4821)
        │   ├── StatusBadge.tsx        # Color-coded clinical status badges
        │   ├── SmsModal.tsx           # Simulated SMS notification message viewer
        │   ├── ConnectivityBanner.tsx # Multi-state network status bar (poor/offline/restored)
        │   ├── Toast.tsx              # Ephemeral feedback alerts
        │   ├── ProtoToolbar.tsx       # Prototype scenario simulator & screen switcher
        │   └── index.ts               # Barrel export
        │
        ├── patient/         # Student web experience screens
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
        │   ├── P11AppointmentDetail.tsx   # Appointment detail & staff change alert
        │   ├── P12CancelConfirm.tsx       # Cancellation prompt
        │   ├── P13AppointmentCancelled.tsx# Cancellation confirmation
        │   ├── P14P17RescheduleFlow.tsx   # 3-step student reschedule flow
        │   ├── P18QueueStatus.tsx         # 5-stage live virtual queue tracker & room assignment
        │   ├── P19AfterHours.tsx          # Clinic closed state with KNUST Hospital guidance
        │   └── index.ts                   # Barrel export
        │
        ├── staff/           # Clinical staff workstation portal
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
        │   └── index.ts                   # Barrel export
        │
        └── edge/            # Network & resilience recovery
            ├── G01NetworkError.tsx        # Offline recovery view with cached reference display
            └── index.ts                   # Barrel export
```

---

## Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Launch local Vite dev server with Hot Module Replacement |
| `npm run build` | Compile TypeScript and build production bundle into `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run format` | Run code formatter |
