# YɛnCare Public Web Client (`frontend/`)

> **React 19 + TailwindCSS v4 + Vite Web Application for YɛnCare Patients and Staff**

---

## 1. Overview

The `frontend/` package contains the public-facing web client for the YɛnCare platform. It delivers a fast, mobile-optimized experience for students at **KNUST University Health Services · Students' Clinic** and **Social Science Block GF7**.

### Key Responsibilities
- **Landing & Discovery**: Communicates clinic services, location details, and queue benefits to students.
- **Appointment Scheduling**: Provides an interactive booking interface communicating directly with the backend Express API.
- **Queue Transparency**: Allows students to track their live queue position remotely from their phone browsers.
- **Staff Gateway**: Provides an entry point for clinic receptionists and doctors.

---

## 2. Technology Stack

- **Framework**: React 19 (`react`, `react-dom` v19.2)
- **Routing**: React Router (`react-router-dom` v7 / `react-router` v8)
- **Styling**: TailwindCSS v4 (`@tailwindcss/vite`, `@tailwindcss/postcss`, `tailwindcss` v4.3)
- **HTTP Client**: Axios (`axios` v1.20)
- **Icons**: React Icons (`react-icons` v5.7)
- **Build Tool**: Vite 8 (`vite` v8.2)

---

## 3. Directory Structure

```text
frontend/
├── public/                 # Static public assets (favicon.svg, icons.svg, manifest)
├── src/
│   ├── assets/             # Brand logos (Yencare Logo.png) and facility photography
│   ├── components/         # Reusable UI sections & primitives
│   │   ├── booking/        # Multi-step booking flow wizard
│   │   │   ├── BookingForm.jsx        # Wizard coordinator & multi-step draft container
│   │   │   ├── WelcomeForm.jsx        # Step 1: Introduction & booking start trigger
│   │   │   ├── PersonalDetails.jsx    # Step 2: Student details & patient registration
│   │   │   ├── ClinicSelection.jsx    # Step 3: Clinic facility selection (Clinic vs Hospital)
│   │   │   ├── ClinicianSelection.jsx # Step 4: Attending doctor selection (Dr. Kwame vs Dr. Ama)
│   │   │   ├── ServiceSelection.jsx   # Step 5: OPD / follow-up / dressing service selector
│   │   │   ├── TimeSlots.jsx          # Step 6: 30-minute consultation slot selector
│   │   │   ├── ReviewBooking.jsx      # Step 7: Final summary, disclosure & confirmation
│   │   │   └── SlotTaken.jsx          # Concurrency collision recovery card
│   │   ├── appointment/    # Self-service lookup, OTP verify, reschedule & cancel cards
│   │   ├── staff/          # Staff roster, verification modal, and live queue widgets
│   │   ├── Nav.jsx         # Main site navigation bar with active route highlighting
│   │   ├── Hero.jsx        # Value proposition header and quick CTA buttons
│   │   ├── CareFeature.jsx # Key feature spotlight cards
│   │   ├── CareTools.jsx   # Clinical tools and virtual queue capability showcase
│   │   ├── GetStarted.jsx  # Student call-to-action banner
│   │   ├── Footer.jsx      # Footer with campus health contact info
│   │   └── ScrollToTop.jsx # Route transition window scroll reset
│   │
│   ├── context/
│   │   └── StaffAuthContext.jsx # Global staff JWT session provider & demo switcher
│   │
│   ├── hooks/              # Custom React hooks (useClinicRoster, useApiRequest)
│   │
│   ├── pages/              # Application routed views
│   │   ├── Home.jsx             # Root landing page (/)
│   │   ├── Appointments.jsx     # Booking & lookup screen (/appointments)
│   │   ├── Queue.jsx            # Live queue tracking screen (/queue)
│   │   ├── ClinicActivity.jsx   # Pre-check-in waiting intelligence (/activity)
│   │   ├── StaffLogin.jsx       # Staff portal sign-in with 1-click demo helpers (/staff/login)
│   │   ├── StaffPortal.jsx      # Reception & admin operations dashboard (/staff)
│   │   ├── DoctorWorkstation.jsx# Doctor consultation workstation (/staff/doctor)
│   │   └── NotFound.jsx         # 404 error catch-all page (*)
│   │
│   ├── services/           # Backend API integration layer
│   │   ├── api.js          # Configured Axios instance with token injection
│   │   ├── patients.js     # Patient registration & lookup API calls
│   │   ├── appointments.js # Booking creation, arrival, cancel & reschedule
│   │   ├── queue.js        # Call next patient, advance visit & mark no-show
│   │   ├── catalog.js      # Facilities, clinicians and time-slots loader
│   │   └── staffAuth.js    # Staff login, JWT token persistence & demo credentials
│   │
│   ├── App.jsx             # Top-level shell router & layout container
│   ├── index.css           # TailwindCSS v4 imports & theme styles
│   └── main.jsx            # Application root mount
│
├── .env.example            # Environment configuration template
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite + React + Tailwind v4 plugin configuration
```

---

## 4. Environment Configuration

The client requires an environment file `.env` to locate the backend Express API:

```bash
# Copy template
copy .env.example .env     # Windows PowerShell
cp .env.example .env        # macOS / Linux
```

### Configuration Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | Optional | `http://localhost:4000/api` | Base URL of the backend API. Must include `/api` suffix. Defaults to `http://localhost:4000/api` if omitted. |

---

## 5. Available Scripts

All commands can be run from within `frontend/` or from the repository root:

| Command (from `frontend/`) | Root Proxy Command | Action |
|---|---|---|
| `npm run dev` | `npm run dev:frontend` | Starts Vite dev server with Hot Module Replacement |
| `npm run build` | `npm run build:frontend` | Compiles production bundle into `dist/` |
| `npm run preview` | — | Locally previews production build |
| `npm run lint` | — | Runs ESLint over project source code |

---

## 6. API Services Integration & Booking Flow

The application integrates with the backend Express API via `src/services/` and `src/hooks/`:

### 6.1 `patients.js`
- `registerPatient(data)`: Posts `{ fullName, studentIndex, phoneNumber, nhis }` to `POST /api/patients`. Public callers get only `{ id }` (status **200** whether the patient was found or created); with a receptionist/admin token the response is the full record, including **`phone` and `phoneNumber`** (same E.164 value).
- Looking a patient up by index or phone (`GET /api/patients/:identifier`) is reception/admin only; the web client has no wrapper for it.

### 6.2 `appointments.js`
- `createAppointment(data)`: Client wrapper for `POST /api/appointments` (links patient, time slot, clinician, and room).

### 6.3 Booking Wizard & Registration Flow
- **`BookingForm.jsx`**: Coordinates 4-step wizard state (`WelcomeForm` → `PersonalDetails` → `ClinicSelection` → `ServiceSelection`).
- **`PersonalDetails.jsx`**:
  - Validates full name, 8-digit student index, and Ghana phone number.
  - Submits to `POST /api/patients` via the `useApiRequest(registerPatient)` hook.
  - Captures `patientId: patient.id` into centralized `formData` on successful registration/find-or-create, and keeps the phone number the student typed.
  - Gracefully displays backend error responses (`400` validation failures, `409` when the details can't be matched, or network drops) and disables submission during loading.

---

## 7. Relationship to Interactive Prototype (`ui/prototype/`)

- **`frontend/`** is the modular, lightweight production web client featuring full client-side routing (`react-router-dom`) and direct integration with the Express REST backend API.
- **`ui/prototype/`** is the comprehensive clinical simulation hub containing the complete 19-screen student journey, 11-screen clinical operations portal, and in-browser scenario simulator (`ProtoToolbar`).
