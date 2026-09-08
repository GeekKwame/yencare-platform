# Contributing to YɛnCare

> **Developer Guidelines, Standards & Contribution Process**

Thank you for contributing to **YɛnCare**! We welcome code contributions, architectural improvements, bug fixes, and documentation updates.

---

## 1. Development Principles

1. **Patient-First Simplicity**: Every feature should reduce friction for students accessing healthcare. Never introduce mandatory passwords or complex verification flows without clinical approval.
2. **Clinical Truth**: Treat clinic operations with absolute precision. Prevent double-booking, preserve wait queues, and ensure auditability.
3. **Repository as Source of Truth**: Keep documentation, types, and database schemas strictly synchronized with the working code.

---

## 2. Setting Up Your Development Environment

1. Follow the **[Local Setup Guide](../development/setup.md)** to clone the repository, install dependencies, and start local services.
2. Review the **[Environment Variables Reference](../development/environment-variables.md)** and ensure `.env` files are configured for offline development (`SMS_PROVIDER=mock`).

---

## 3. Recommended Git & Branching Workflow

1. Create a feature branch from latest `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```
2. Make focused, atomic commits following the [Conventional Commits](https://www.conventionalcommits.org/) standard:
   - `feat(backend): add route for live queue polling`
   - `fix(frontend): correct mobile padding on appointment review screen`
   - `docs(api): document query parameters for patient search`
3. Regularly synchronize your feature branch with `main`:
   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   git checkout feat/your-feature-name
   git merge main
   ```
   *(For full synchronization guidance, see [Git & Branch Synchronization](../development/workflow.md))*.

---

## 4. Code & Architecture Standards

### Backend (`backend/`)
- **Module System**: Strict ECMAScript Modules (`"type": "module"`). Use `import` and `export`; do not use CommonJS `require()`.
- **Error Handling**: Use the central error middleware in `src/http/app.js` with structured HTTP status codes (`400`, `404`, `409`, `500`).
- **SMS Gateway**: Always route notifications through `src/sms/sendSms.js`. Never invoke third-party SMS providers directly from route handlers.

### Frontend Client (`frontend/`)
- **Stack**: React 19, React Router v7/v8, Axios, TailwindCSS v4.
- **Service Isolation**: Route all backend communication through Axios services in `src/services/` (e.g., `patients.js`, `appointments.js`).

### Interactive Prototype (`ui/prototype/`)
- **Stack**: React 19, TypeScript, Vite, TailwindCSS v4.
- **Types**: Define all domain models in `src/types/clinic.ts`.
- **State**: Manage state transitions via `ClinicContext.tsx`.

---

## 5. Quality Verification & Testing

Before opening a pull request, run the test suites and build verifications:

```bash
# 1. Run all backend automated tests
npm --prefix backend test

# 2. Verify interactive prototype builds
npm run build

# 3. Verify public frontend builds
npm --prefix frontend run build
```

Ensure all tests pass and zero TypeScript or bundle errors are reported.

---

## 6. Submitting a Pull Request (PR)

1. Push your branch to GitHub:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request targeting `main`.
3. Provide a clear summary:
   - **What changed**: Brief explanation of added or modified features.
   - **Why**: Clinical or technical context.
   - **Verification**: Commands executed and screenshots/terminal output demonstrating success.
4. Request review from team members. Address feedback promptly.
