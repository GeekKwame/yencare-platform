# Developer Local Setup Guide

> **Complete Onboarding & Environment Setup for YɛnCare Platform**

---

## 1. Prerequisites & System Requirements

Before beginning local development, verify that your machine has the following tools installed:

| Tool | Minimum Version | Recommended | Notes |
|---|---|---|---|
| **Node.js** | `>= 18.0.0` | `v20.x LTS` or `v22.x` | Required for native test runner & ESM modules |
| **npm** | `>= 9.0.0` | `v10.x` | Package manager |
| **Git** | `>= 2.30.0` | Latest | Version control |
| **Docker & Docker Compose** | Latest | Latest | Recommended for running local MongoDB 7 |

*Optional Alternative for Database*: A free MongoDB Atlas cluster connection string (`mongodb+srv://...`) can be used in place of local Docker.

---

## 2. Step-by-Step Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/GeekKwame/yencare-platform.git
cd yencare-platform
```

### Step 2: Install Dependencies
The repository consists of modular packages. You can install all dependencies from the root:

```bash
# 1. Install root proxy dependencies
npm install

# 2. Install backend dependencies
npm --prefix backend install

# 3. Install frontend web client dependencies
npm --prefix frontend install

# 4. Install interactive clinical prototype dependencies
npm --prefix ui/prototype install
```

---

## 3. Environment Configuration

### 3.1 Backend Configuration (`backend/.env`)
Copy the provided example environment file in `backend/`:

```bash
# Windows PowerShell
copy backend\.env.example backend\.env

# macOS / Linux / Git Bash
cp backend/.env.example backend/.env
```

Open `backend/.env` in your editor. For offline local development, the defaults are ready to use immediately:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/yencare
SMS_PROVIDER=mock
```

*(To test real Ghana SMS delivery via mNotify or Africa's Talking, refer to the [SMS Providers Guide](../operations/sms-providers.md)).*

### 3.2 Frontend Configuration (`frontend/.env`)
Copy the frontend environment file:

```bash
# Windows PowerShell
copy frontend\.env.example frontend\.env

# macOS / Linux / Git Bash
cp frontend/.env.example frontend/.env
```

Ensure `VITE_API_BASE_URL` is set to point to the local backend API:
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

---

## 4. Starting the Database

### Option A: Local MongoDB via Docker Compose (Recommended)
From the repository root or the `backend/` directory:

```bash
# From repository root
docker compose -f backend/docker-compose.yml up -d
```

Confirm the container is running and healthy:
```bash
docker ps
```

### Option B: MongoDB Atlas
If you prefer cloud-hosted MongoDB, paste your Atlas connection URI into `backend/.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/yencare?retryWrites=true&w=majority
```

---

## 5. Applying Database Migrations & Seed Data

Initialize collections, validation rules, and unique compound indexes:

```bash
# Apply schema validators and create unique indexes
npm run db:migrate

# Seed demo clinicians, rooms, and sample September 15 2026 schedule
npm run db:seed
```

*(Both scripts support a `--dry-run` mode: `npm run db:migrate:dry` and `npm run db:seed:dry`)*.

---

## 6. Running the Development Servers

You can run each component independently or side-by-side in separate terminal windows:

### Terminal 1: Backend Express API
```bash
npm run dev:api
```
- Server starts at **[http://localhost:4000](http://localhost:4000)** with automatic file watching via Node's `--watch`.
- Verify the server health check in your browser or curl:
  ```bash
  curl http://localhost:4000/health
  # Response: {"ok":true,"service":"yencare-api"}
  ```

### Terminal 2: Interactive Clinical Prototype & Workstation Simulator
```bash
npm run dev
```
- Starts the Vite development server for `ui/prototype`.
- Available at **[http://localhost:5173/](http://localhost:5173/)**.
- Includes the full student booking flow (P01–P19), staff portal (S01–S10), and the floating scenario simulator (`ProtoToolbar`).

### Terminal 3: Public Frontend Web Client
```bash
npm run dev:frontend
```
- Starts the Vite development server for `frontend/`.
- Available at **[http://localhost:5174/](http://localhost:5174/)** (or next available port).
- Connects directly to `http://localhost:4000/api` for live patient registration.

---

## 7. Port Allocation Summary

| Port | Service | Configuration Variable | Purpose |
|---|---|---|---|
| **4000** | Express API Server | `PORT=4000` (`backend/.env`) | REST endpoints (`/health`, `/api/patients`) |
| **5173** | Interactive Prototype | Default Vite Port (`ui/prototype`) | Complete clinical simulation & scenario tester |
| **5174** | Public Web Frontend | Default Vite Port (`frontend/`) | Public web app connected to backend API |
| **27017** | MongoDB Engine | `MONGODB_URI` (`backend/.env`) | Local database storage (via Docker) |

---

## 8. Verification Checklist for New Developers

Confirm your setup is operational:
1. `GET http://localhost:4000/health` returns `{"ok":true,"service":"yencare-api"}`.
2. `npm run test:backend` executes and passes all 61 automated tests.
3. Prototype runs at `http://localhost:5173/` and allows walking through booking screens P01–P07.
4. Terminal displays `[SMS mock] to=+233...` when registering a patient or booking in mock mode.
