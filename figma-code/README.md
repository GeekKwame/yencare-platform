# YɛnCare Web Client (`/figma-code`)

This directory contains the production-refined React 19 + TypeScript + Vite web application for the YɛnCare clinic scheduling and live virtual queue system.

---

## Quickstart

```bash
# From this directory:
npm install
npm run dev

# Or from project root:
npm run dev
```

The application will be served locally at `http://localhost:5173/`.

---

## Directory Architecture

```
src/
├── components/
│   ├── common/              # Reusable design system primitives
│   │   ├── Button.tsx       # Primary, secondary, accent, destructive, outline buttons
│   │   ├── GhanaPhoneInput.tsx # Ghana (+233) formatted phone input
│   │   ├── ReferenceBlock.tsx  # High-visibility speakable reference box (YC-4821)
│   │   ├── StatusBadge.tsx  # Status badges (Booked, Waiting, Called, Completed, etc.)
│   │   ├── Toast.tsx        # Ephemeral alert messages
│   │   ├── ProtoToolbar.tsx # Floating prototype tester & scenario simulator
│   │   └── index.ts         # Barrel export
│   │
│   ├── patient/             # Patient-facing web flow (P01–P18)
│   │   ├── PatientHeader.tsx          # Clean clinical header navigation
│   │   ├── P01Home.tsx                # Welcome landing & dashboard
│   │   ├── P02YourDetails.tsx         # Patient name & Ghana phone number (Step 1)
│   │   ├── P03ChooseDoctor.tsx        # Doctor & specialty selector (Step 2)
│   │   ├── P04P05DateTime.tsx         # Available date & 30-min time slot picker (Step 3)
│   │   ├── P06ReviewBooking.tsx       # Booking summary review (Step 4)
│   │   ├── P07BookingConfirmed.tsx    # Confirmed booking & reference code
│   │   ├── P08SlotTaken.tsx           # Slot conflict / clash recovery state
│   │   ├── P09FindAppointment.tsx     # Phone & reference lookup
│   │   ├── P11AppointmentDetail.tsx   # Appointment detail & management hub
│   │   ├── P12CancelConfirm.tsx       # Cancellation confirmation prompt
│   │   ├── P13AppointmentCancelled.tsx# Cancellation completion view
│   │   ├── P14P17RescheduleFlow.tsx   # 3-step reschedule flow & confirmation
│   │   ├── P18QueueStatus.tsx         # Live queue position (#4) & 5-step lifecycle
│   │   └── index.ts                   # Barrel export with human-readable aliases
│   │
│   ├── staff/               # Clinic staff workstation portal (S01–S07)
│   │   ├── StaffLayout.tsx            # Operations shell with sidebar & role badge
│   │   ├── S01SignIn.tsx              # Staff workstation sign-in
│   │   ├── S02Today.tsx               # Today's operations dashboard & metric cards
│   │   ├── S03Appointments.tsx        # Appointments roster & reception check-in
│   │   ├── S04PatientDetail.tsx       # Clinical check-in & patient dossier
│   │   ├── S05LiveQueue.tsx           # Live queue board & Room 3 active consultation
│   │   ├── S05EmptyQueue.tsx          # Empty queue state
│   │   ├── S07SessionExpired.tsx      # Security timeout modal
│   │   └── index.ts                   # Barrel export with human-readable aliases
│   │
│   └── edge/                # Edge & network recovery states
│       ├── G01NetworkError.tsx        # Offline / low connectivity banner & retry
│       └── index.ts                   # Barrel export
│
├── context/
│   ├── ClinicContext.tsx    # Global state machine, mock data, & scenario triggers
│   └── index.ts             # Barrel export
│
├── types/
│   ├── clinic.ts            # TypeScript interfaces & state enumerations
│   └── index.ts             # Barrel export
│
├── App.tsx                  # Root shell router (Patient Shell vs Staff Shell)
├── index.css                # Clinical Brutalism theme variables & utilities (Tailwind v4)
└── main.tsx                 # React DOM mount
```

---

## Available Scripts

- `npm run dev`: Launch local Vite dev server with Hot Module Replacement (HMR).
- `npm run build`: Compile TypeScript and build production bundle into `dist/`.
- `npm run preview`: Preview the production build locally.
- `npm run format`: Format source files with `oxfmt`.
