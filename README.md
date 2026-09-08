# YɛnCare — Outpatient Healthcare & Virtual Queue Platform

> **Healthcare access, wherever you are. Ghana.**  
> Outpatient clinic appointment scheduling and live virtual queue management for **KNUST University Health Services · Students' Clinic** and **Social Science Block GF7**.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-brightgreen.svg)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-66%20passing-success.svg)](./backend/test/)

---

## 1. Project Overview

**YɛnCare** is an outpatient clinic management and virtual queue platform designed for campus and regional healthcare clinics across Ghana, centered on the **KNUST University Health Services · Students' Clinic** and its satellite facility at **Social Science Block GF7**.

### The Problem It Solves
University healthcare corridors frequently suffer from severe overcrowding, long physical waiting queues, and chaotic triage desks. Students waste hours sitting in waiting rooms during lectures, while clinic staff struggle to manage unscheduled walk-ins alongside pre-booked visits.

### Core Value Propositions
- **No Password Barrier**: Students book appointments using only their Full Name, 8-digit KNUST Student Index Number (`20612345`), and Ghana mobile number (`+233`). No password creation, password recovery, or account setup is required.
- **Speakable Reference Codes**: Every booking generates an oral, memorable 4-digit code (**`YC-4821`**) designed for quick verification at the reception desk and in SMS notifications.
- **Virtual Waiting & Campus Freedom**: Students track their live queue position (`#4`), estimated wait time (`~20 min`), and assigned consultation room (`Room 1` or `Room 2`) remotely from anywhere on campus.
- **Unified Clinical Operations**: Reception check-in, doctor room assignment, unscheduled walk-in registration (`W-024`), and no-show slot recovery in a single operational workstation.
- **Clinical Brutalism Design Identity**: High-contrast, structured editorial minimalism featuring a calm healthcare palette (`#111111`, `#F7F8F7`, `#087F6C`, `#E7F5F1`), crisp typography (Hanken Grotesk), and accessible 44px+ touch targets.

---

## 2. Key Implemented Features

### Patient Web Experience
- **6-Step Booking Funnel**: Details (name, index, phone, NHIS) &rarr; Clinic Site &rarr; Visit Type &rarr; Clinician &rarr; Date & Slot Time &rarr; Review & Confirm.
- **Emergency Safety Gate**: Automatic triage detector on visit selection that triggers immediate safety guidance and direct telephone routing to emergency services for acute symptoms.
- **Tabbed Appointment Lookup**: Self-service lookup using Student Index, `YC-` Reference, or Phone number.
- **Pre-Check-In Clinic Activity**: Real-time waiting intelligence, active doctor duty roster, and wait-time advisories before students leave their dormitories.
- **Self-Service Reschedule & Cancellation**: Instant 3-step date/time modification and slot release.
- **5-Stage Live Queue Tracker**: Live progress tracking (`Booked` &rarr; `Checked in` &rarr; `Waiting` &rarr; `Called` &rarr; `Completed`).
- **Resilience Recovery**: Offline network recovery screen (G01) displaying cached reference codes when cellular signal drops.

### Clinical Operations Workstation
- **Role-Based Demo Access**: 1-click role switching for `Receptionist`, `Doctor`, and `Admin`.
- **Today Dashboard**: Real-time metrics tracking Total Patients, Waiting, In Consult, Completed, Walk-Ins, and No-Shows.
- **Appointments Roster**: Filterable and searchable daily schedule with one-click check-in.
- **Dual-Room Live Queue Board**: Queue management for Room 1 and Room 2 with distinct `BOOKED` vs `WALK-IN` badges.
- **Walk-In Registration**: Front-desk intake workflow allocating dedicated daily walk-in tokens (`W-024`).
- **Public Corridor Display Board**: Full-screen TV display board for waiting areas showing called tokens and room assignments.
- **Missed Slot Recovery**: Formal No-Show confirmation workflow to release unused consultation slots.

### Backend REST API & SMS Gateway
- **Idempotent Patient Registration**: `POST /api/patients` find-or-creates students without identity duplication. JSON returns both **`phone`** (Mongo / populate / SMS) and **`phoneNumber`**.
- **Fast Identifier Lookup**: `GET /api/patients/:identifier` by 8-digit index or Ghana mobile number.
- **Clinic Catalog**: `GET /api/rooms`, `GET /api/clinicians`, `GET /api/time-slots` for booking ObjectIds (Postman).
- **Double-Booking Engine Guards**: MongoDB engine-level unique compound indexes preventing clinician or room clashes.
- **Multi-Provider SMS Gateway**: Unified `sendSms(to, message)` engine supporting real Ghana mobile delivery (mNotify), developer simulation (Africa's Talking Sandbox), and offline terminal logging (Mock).

---

## 3. Technology Stack

| Layer | Technologies | Role |
|---|---|---|
| **Public Frontend** | React 19, React Router v7/v8, Axios, TailwindCSS v4, Vite | Lightweight public web client connected to Express API |
| **Interactive Prototype** | React 19, TypeScript, Vite, TailwindCSS v4, Custom Design Tokens | 30-screen clinical simulation hub & scenario tester |
| **Backend API** | Node.js 18+, Express 4, Mongoose 8, Native MongoDB Driver | REST API service, business logic, validation |
| **Persistence** | MongoDB 7 (via Docker Compose or MongoDB Atlas) | Schemas, unique indexes, double-booking prevention |
| **SMS Gateway** | mNotify API v2, Africa's Talking SDK, Local Mock Provider | Outbound SMS delivery to MTN, Telecel, and AT Ghana |
| **Testing** | Node.js Native Test Runner (`node:test`) | 66 automated unit and integration tests |

---

## 4. Repository Structure

```text
yencare-platform/
├── docs/                     # Central documentation hub
│   ├── architecture/         # System architecture, database schema, state transitions
│   ├── api/                  # REST API specification, request/response models
│   ├── development/          # Local developer setup, environment variables, Git workflow
│   ├── testing/              # Test suites, runner commands, scenario simulation
│   ├── security/             # Data privacy, token security, secret isolation
│   ├── operations/           # SMS providers (mNotify/AT/Mock), DB migrations & seeds
│   ├── contributing/         # Contribution standards, branch conventions, PR checklist
│   └── README.md             # Documentation portal table of contents
│
├── backend/                  # Node.js + Express REST API + MongoDB + SMS Gateway
│   ├── docker-compose.yml    # Local MongoDB 7 service
│   ├── package.json          # Backend dependencies & npm scripts
│   ├── README.md             # Backend developer guide & curl examples
│   ├── docs/                 # Backend schema & database architecture reference
│   ├── scripts/              # Migration (`migrate.js`), seed (`seed.js`), test SMS
│   ├── src/                  # Express app, HTTP routes, models, services, SMS providers
│   └── test/                 # 66 automated unit and integration tests (node:test)
│
├── frontend/                 # Public web application (React 19 + TailwindCSS v4 + Vite)
│   ├── package.json          # Dependencies & scripts
│   ├── README.md             # Web client architecture & service integration guide
│   ├── src/pages/            # Home, Appointments, Queue, StaffPortal, NotFound
│   ├── src/services/         # Axios API clients for backend patient & appointment routes
│   └── src/components/       # Reusable UI sections and navigation elements
│
├── ui/                       # Design Hub, Reference Wireframes & Prototype Simulator
│   ├── README.md             # UI directory overview & navigation
│   ├── prototype/            # High-fidelity React 19 + TypeScript clinical simulator
│   ├── wireframe/            # Visual reference HTML & PNG export frames (Stitch UI)
│   └── docs/                 # UX architecture specifications, Figma prompts, design locks
│
├── package.json              # Root proxy scripts (npm run dev, npm run dev:api, etc.)
└── .gitignore                # Environment & build artifact exclusion rules
```

---

## 5. Prerequisites

- **Node.js**: `v18.0.0+` or `v20.x LTS` (Recommended)
- **npm**: `v9.0.0+`
- **Docker & Docker Compose**: Recommended for local MongoDB 7 *(or a free MongoDB Atlas connection string)*

---

## 6. Quickstart & Installation

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/GeekKwame/yencare-platform.git
cd yencare-platform

# Install root dependencies
npm install

# Install backend dependencies
npm --prefix backend install

# Install frontend web client dependencies
npm --prefix frontend install

# Install interactive clinical prototype dependencies
npm --prefix ui/prototype install
```

### Step 2: Configure Environment Files
```bash
# Windows PowerShell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env

# macOS / Linux / Git Bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

*For offline local development, the default `.env` files work immediately with zero configuration.*

### Step 3: Start MongoDB
```bash
docker compose -f backend/docker-compose.yml up -d
```

### Step 4: Run Database Migrations & Seed Data
```bash
# Apply schema validators and create unique indexes
npm run db:migrate

# Seed demo clinicians, rooms, and sample schedule
npm run db:seed
```

---

## 7. Running the Application

| Target | Command | URL | Description |
|---|---|---|---|
| **Interactive Prototype** | `npm run dev` | `http://localhost:5173/` | Complete 30-screen clinical simulation hub |
| **Backend Express API** | `npm run dev:api` | `http://localhost:4000/` | Express REST API (`/health`, `/api/patients`, `/api/rooms`, `/api/clinicians`, `/api/time-slots`) |
| **Public Frontend** | `npm run dev:frontend` | `http://localhost:5174/` | Public web client connected to Express API |

### Available Root Commands

```bash
# Development
npm run dev               # Launch interactive prototype (Vite on :5173)
npm run dev:api           # Launch Express API with file-watch (Node on :4000)
npm run dev:frontend      # Launch public frontend web client (Vite on :5174)

# Production Builds
npm run build             # Build interactive prototype bundle into ui/prototype/dist
npm run build:frontend    # Build public web client bundle into frontend/dist

# Database
npm run db:migrate        # Apply collection validators and unique indexes
npm run db:seed           # Populate sample demo clinicians, rooms, and schedule

# Testing
npm run test:backend      # Execute all 66 backend unit & integration tests
npm run sms:test          # Send a test SMS via configured provider (Mock / mNotify / AT)
```

---

## 8. Environment Variables

| Variable | Scope | Default | Description |
|---|---|---|---|
| `PORT` | `backend/.env` | `4000` | Express API HTTP listen port |
| `MONGODB_URI` | `backend/.env` | `mongodb://127.0.0.1:27017/yencare` | MongoDB connection URI (Docker or Atlas) |
| `SMS_PROVIDER` | `backend/.env` | `mock` | Outbound SMS provider: `mock`, `mnotify`, or `africastalking` |
| `MNOTIFY_API_KEY` | `backend/.env` | *Empty* | mNotify API v2 key for real Ghana phone delivery |
| `MNOTIFY_SENDER_ID` | `backend/.env` | `YenCare` | Approved alphanumeric SMS sender header (max 11 chars) |
| `AT_USERNAME` | `backend/.env` | `sandbox` | Africa's Talking sandbox username |
| `AT_API_KEY` | `backend/.env` | *Empty* | Africa's Talking sandbox API key |
| `VITE_API_BASE_URL` | `frontend/.env` | `http://localhost:4000/api` | Base URL used by Axios in the public frontend client |

*(Full details: [Environment Variables Reference](./docs/development/environment-variables.md))*.

---

## 9. Testing & Quality Assurance

### Automated Backend Tests
Run the automated test suite powered by Node's native test runner (`node:test`):

```bash
npm run test:backend
```

Tests validate:
- Patient find-or-create API (`POST /api/patients`) and identifier lookups (`GET /api/patients/:identifier`), including dual `phone` / `phoneNumber` JSON.
- Clinic catalog (`GET /api/rooms`, `/api/clinicians`, `/api/time-slots`).
- Ghana telephone normalization (E.164 conversion and local 0-prefix formatting).
- Speakable reference code generation (`YC-XXXX`).
- Mongoose schema integrity and double-booking compound index constraints.
- Multi-provider SMS fallback and delivery engine.

### Interactive Clinical Scenario Simulator (`ProtoToolbar`)
When running `npm run dev` at `http://localhost:5173/`:
- Use the floating control panel at the bottom right to step patient sessions through `BOOKED` &rarr; `CHECKED_IN` &rarr; `WAITING` &rarr; `CALLED` &rarr; `COMPLETED`.
- Inject live walk-ins (`W-024`), mark seeded appointments as `NO_SHOW`, test staff-initiated reschedules, toggle after-hours mode, and simulate cellular disconnections (`offline` &rarr; G01).

---

## 10. Development Workflow & Contributing

The team follows a Git feature-branch workflow.

### Keeping Feature Branches Synchronized
```bash
git fetch origin
git checkout main
git pull origin main
git checkout feat/your-feature
git merge main
```

Before opening a pull request, confirm:
1. All backend tests pass (`npm run test:backend`).
2. Prototype and frontend build cleanly (`npm run build`, `npm run build:frontend`).
3. No secrets or private `.env` files are tracked by Git.

*(Read our complete [Contribution Guidelines](./docs/contributing/CONTRIBUTING.md) and [Git Workflow Guide](./docs/development/workflow.md))*.

---

## 11. Documentation Directory

For in-depth architectural, operational, and API specifications, consult our central documentation portal in [`docs/`](./docs/README.md):

- 🏛️ **[System Architecture](./docs/architecture/overview.md)**
- 🗄️ **[Database Architecture & Schema](./docs/architecture/database.md)**
- 🔄 **[Queue & State Machines](./docs/architecture/state-machine.md)**
- 🔌 **[REST API Reference](./docs/api/reference.md)**
- 🚀 **[Developer Setup Guide](./docs/development/setup.md)**
- ⚙️ **[Environment Variables Reference](./docs/development/environment-variables.md)**
- 🌿 **[Git Workflow & Synchronization](./docs/development/workflow.md)**
- 🧪 **[Testing & Verification Guide](./docs/testing/testing-guide.md)**
- 🛡️ **[Security & Compliance](./docs/security/security-and-compliance.md)**
- 📱 **[SMS Provider Handbook](./docs/operations/sms-providers.md)**
- 🗃️ **[Database Operations & Maintenance](./docs/operations/database-ops.md)**
- 🤝 **[Contribution Guidelines](./docs/contributing/CONTRIBUTING.md)**