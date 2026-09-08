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
├── public/                 # Static public assets (favicon.svg, icons.svg)
├── src/
│   ├── assets/             # Brand logos (Yencare Logo.png)
│   ├── components/         # Reusable UI sections & primitives
│   │   ├── Nav.jsx         # Main site navigation bar with active route highlighting
│   │   ├── Hero.jsx        # Value proposition header and quick CTA buttons
│   │   ├── CareFeature.jsx # Key feature spotlight cards
│   │   ├── CareTools.jsx   # Clinical tools and virtual queue capability showcase
│   │   ├── GetStarted.jsx  # Student call-to-action banner
│   │   ├── Footer.jsx      # Footer with campus health contact info
│   │   └── ScrollToTop.jsx # Route transition window scroll reset
│   │
│   ├── hooks/
│   │   └── useApiRequest.js # Custom async state hook for API requests
│   │
│   ├── pages/              # Application routed views
│   │   ├── Home.jsx        # Root landing page (/)
│   │   ├── Appointments.jsx# Booking & lookup screen (/appointments)
│   │   ├── Queue.jsx       # Live queue tracking screen (/queue)
│   │   ├── StaffPortal.jsx # Staff operations dashboard (/staff)
│   │   └── NotFound.jsx    # 404 error catch-all page (*)
│   │
│   ├── services/           # Backend API integration layer
│   │   ├── api.js          # Configured Axios instance (VITE_API_BASE_URL)
│   │   ├── patients.js     # Patient registration & lookup API calls
│   │   └── appointments.js # Appointment creation client stub
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
| `VITE_API_BASE_URL` | Yes | `http://localhost:4000/api` | Base URL of the backend API. Must include `/api` suffix. |

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

## 6. API Services Integration

The application integrates with the backend Express API via `src/services/`:

### 6.1 `patients.js`
- `registerPatient(data)`: Posts `{ fullName, studentIndex, phoneNumber, nhis }` to `POST /api/patients`. The JSON response includes **`phone` and `phoneNumber`** (same E.164 value). Use `phone` when talking to Mongo/SMS.
- `lookupPatient(identifier)`: Queries `GET /api/patients/:identifier` using student index or Ghana phone number.

### 6.2 `appointments.js`
- `createAppointment(data)`: Client wrapper for `POST /api/appointments` (links patient, time slot, clinician, and room).

---

## 7. Relationship to Interactive Prototype (`ui/prototype/`)

- **`frontend/`** is the modular, lightweight production web client featuring full client-side routing (`react-router-dom`) and direct integration with the Express REST backend API.
- **`ui/prototype/`** is the comprehensive clinical simulation hub containing the complete 19-screen student journey, 11-screen clinical operations portal, and in-browser scenario simulator (`ProtoToolbar`).
