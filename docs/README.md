# YɛnCare Platform Documentation Hub

> **Healthcare access, wherever you are. Ghana.**  
> Central documentation portal for the YɛnCare outpatient clinic appointment booking and live virtual queue platform.

---

## Welcome to YɛnCare

**YɛnCare** is an outpatient healthcare management and queue-optimization platform built for clinics across Ghana, centered on the **KNUST University Health Services · Students' Clinic** and the satellite clinic at **Social Science Block GF7**.

The platform is designed to eliminate congestion in clinical waiting rooms through password-free appointment booking, memorable reference codes (`YC-4821`), SMS notifications, and real-time live virtual queue monitoring.

---

## Documentation Index

Explore our comprehensive technical and operational guides:

| Section | Description | Key Documents |
|---|---|---|
| **[Architecture](./architecture/overview.md)** | System architecture, system topology, database design, and lifecycle state machines | • [System Overview](./architecture/overview.md)<br>• [Database Architecture](./architecture/database.md)<br>• [Queue & Appointment State Machines](./architecture/state-machine.md) |
| **[API Reference](./api/reference.md)** | REST API specification, request/response models, status codes, and endpoint documentation | • [REST API Reference](./api/reference.md) |
| **[Development](./development/setup.md)** | Getting started, local setup, environment configuration, and daily workflows | • [Local Setup Guide](./development/setup.md)<br>• [Environment Variables Reference](./development/environment-variables.md)<br>• [Git & Branch Synchronization](./development/workflow.md) |
| **[Testing](./testing/testing-guide.md)** | Backend unit tests, migration checks, build verification, and prototype simulator | • [Testing & Verification Guide](./testing/testing-guide.md) |
| **[Security](./security/security-and-compliance.md)** | Patient data confidentiality, authentication design, secrets management, and API hygiene | • [Security & Compliance Guide](./security/security-and-compliance.md) |
| **[Operations](./operations/sms-providers.md)** | Third-party services, SMS delivery, database migrations, and operational runbooks | • [SMS Gateway Handbook](./operations/sms-providers.md)<br>• [Database Operations & Seed Runbook](./operations/database-ops.md) |
| **[Contributing](./contributing/CONTRIBUTING.md)** | Team development standards, commit formatting, and pull request procedures | • [Contribution Guidelines](./contributing/CONTRIBUTING.md) |

---

## Repository Structure at a Glance

The YɛnCare platform codebase is organized into four core functional directories:

```text
yencare-platform/
├── docs/                     # Central documentation hub (Architecture, API, Operations, etc.)
│   ├── architecture/         # System architecture, database schema, state transitions
│   ├── api/                  # REST API contract, request/response schemas
│   ├── development/          # Local developer setup, environment variables, Git workflow
│   ├── testing/              # Test suites, runner commands, scenario simulation
│   ├── security/             # Data privacy, token security, secret isolation
│   ├── operations/           # SMS providers (mNotify/AT/Mock), DB migrations & seeds
│   └── contributing/         # Contribution standards, branch conventions, PR checklist
│
├── backend/                  # Node.js + Express API + MongoDB (Mongoose) + SMS Gateway
│   ├── docker-compose.yml    # Local MongoDB 7 service
│   ├── scripts/              # Migration (`migrate.js`), seed (`seed.js`), SMS testing
│   ├── src/                  # Express app, HTTP routes, models, services, SMS providers
│   └── test/                 # Node.js native test runner suite (66 passing tests)
│
├── frontend/                 # Public web application (React 19 + Vite + TailwindCSS v4)
│   ├── src/pages/            # Home, Appointments, Queue, StaffPortal, NotFound
│   ├── src/services/         # Axios API clients for backend patient & appointment endpoints
│   └── src/components/       # Reusable UI sections and navigation elements
│
└── ui/                       # Design Hub, Reference Wireframes & Interactive Prototype
    ├── prototype/            # High-fidelity React 19 + TypeScript + Vite interactive simulator
    ├── wireframe/            # Visual reference HTML & PNG export frames (Stitch UI)
    └── docs/                 # UX architecture specifications, Figma prompts, design locks
```

---

## Project Heritage & Foundational Documents

The `docs/` root directory contains original capstone briefings and product vision artifacts:

- [`AmaliTech_Capstone_Internship_Intern_Briefing.pdf`](./AmaliTech_Capstone_Internship_Intern_Briefing.pdf) — Academic & internship program requirements.
- [`YenCare_Scope_Sheet.pdf`](./YenCare_Scope_Sheet.pdf) — Gate 1 product scope and functional boundaries.
- [`YɛnCare_Product_Story_and_Vision.pdf`](./YɛnCare_Product_Story_and_Vision.pdf) — Founding narrative, clinical context, and patient impact vision.

---

## Quick Navigation for Developers

1. **New to the project?** Start with the **[Local Setup Guide](./development/setup.md)** to install dependencies and spin up local services.
2. **Integrating an API?** Review the **[REST API Reference](./api/reference.md)** and **[Database Architecture](./architecture/database.md)**.
3. **Working on UI/UX?** Check the **[UI Hub Overview](../ui/README.md)** and the **[UX Architecture Specification](../ui/docs/YENCARE_UX_ARCHITECTURE_SPEC.md)**.
4. **Sending SMS in Ghana?** Read the **[SMS Providers Guide](./operations/sms-providers.md)**.
