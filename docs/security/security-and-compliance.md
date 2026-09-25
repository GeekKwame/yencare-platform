# Security & Privacy Guidelines

> **Data Protection, Identity Model & Production Security Standards for YɛnCare**

---

## 1. Healthcare Privacy Context in Ghana

As a healthcare access platform operating within Ghana, YɛnCare handles personal identifiable information (PII) including student names, student index numbers, and mobile phone numbers, as well as operational clinic visit data.

System design adheres to principles outlined in the **Ghana Data Protection Act, 2012 (Act 843)**:
- **Data Minimization**: Only collect what is strictly necessary to identify the student and schedule their outpatient consultation.
- **Purpose Limitation**: Personal data is collected exclusively for clinic visit management and queue tracking.
- **Confidentiality**: Medical history, diagnostic details, and prescription notes are intentionally excluded from the public booking and lookup interface.

---

## 2. Password-Free Identity Model & Verification

### Design Rationale
In campus outpatient clinics, password requirements create significant friction, resulting in forgotten credentials, registration delays, and crowded physical waiting rooms.

### Security Balance
1. **Booking & Lookup**: Students identify using their **Full Name**, **8-digit KNUST Student Index Number**, and **Ghana Mobile Phone Number**.
2. **Read Scope**: Looking up an appointment by reference or phone exposes only visit logistics (date, time, clinic site, queue position, assigned doctor). **No sensitive medical dossiers or diagnostic records are exposed via public lookups.**
3. **Physical Reception Verification**: Physical access to the doctor's consultation room requires in-person check-in at the clinic reception desk, where staff cross-verify the student's physical KNUST Student ID card with the registered index number.

---

## 3. Application Security Controls in Code

The following security controls are implemented in the active codebase:

### 3.1 Request Payload Limits
Express body parsing is restricted to a maximum of **32 KB** in `src/http/app.js`:
```javascript
app.use(express.json({ limit: '32kb' }));
```
This protects against memory exhaustion and payload injection denial-of-service (DoS) attempts.

### 3.2 Cross-Origin Resource Sharing (CORS)
CORS is restricted to the staging Vercel frontend (`https://yencare-platform.vercel.app` and other `yencare-platform*.vercel.app` hosts), plus localhost during local development.

Set `CORS_ORIGIN` on Render to the canonical Vercel URL. Unknown origins do not receive `Access-Control-Allow-Origin`.

### 3.3 Strict Input Validation & Normalization
- **Student Index**: Strictly enforced to **exactly 8 numeric digits** (`/^[0-9]{8}$/`). Non-digit or mismatched lengths return `400 Bad Request`.
- **Ghana Phone Numbers**: Normalized into E.164 standard (`+233...`). Local variants (`024...`, `24...`, `233...`) are parsed and validated before database persistence.
- **Full Name**: Length bounded between 2 and 120 characters to prevent buffer and formatting abuse.
- **Identifier URLs**: All user input used in URL paths is encoded (`encodeURIComponent`) to prevent path injection.

### 3.4 Conflict Detection
If a student index belongs to one registered patient and a telephone number belongs to another, the service halts with `409 Conflict` to prevent identity overwriting or unauthorized association.

### 3.5 Defense-in-Depth Generic NoSQL Operator Sanitization
In addition to schema-level casting, global Express middleware (`nosqlSanitizer` in `src/http/security.js`, mounted in `src/http/app.js`) recursively inspects `req.body`, `req.query`, and `req.params`:
- Strips any keys starting with `$` (neutralizing query operator injections such as `$gt`, `$ne`, `$regex`, `$where`).
- Strips dotted property paths (neutralizing path injection).
- Strips prototype pollution keys (`__proto__`, `constructor`, `prototype`).
- Protects all endpoints unconditionally without requiring per-route boilerplate.

### 3.6 Public Waiting Room Privacy & Act 843 Compliance
To satisfy Ghana Data Protection Act (Act 843) requirements on public waiting room screens:
- **Corridor Display Boards (S10, Corridor TV, Clinic Activity)**: Public screens and `GET /api/queue/activity` expose only tokens (`nowServingToken`, `waitingTokens`) and consulting room labels. Student names and phone numbers are never broadcast on public monitors.
- **Public Appointment Lookups**: `GET /api/appointments/:reference` and `GET /api/appointments/lookup` dynamically mask patient identifiers (`+233 24 **** 567` and `2061****`) via `maskAppointmentForLookup`. Full unmasked records are accessible solely to authenticated clinical staff holding valid JWT credentials.

---

## 4. Secrets Management

- **Zero-Secret Repositories**: Real API keys (`MNOTIFY_API_KEY`, `AT_API_KEY`), database passwords, and private connection strings are strictly omitted from version control.
- **Gitignore Protection**: `.env` and `.env.local` files across `backend/`, `frontend/`, and `ui/prototype/` are listed in `.gitignore`.
- **Template Synchronization**: `.env.example` provides safe templates with dummy values and explanatory setup instructions.

---

## 5. Security Controls Implemented & Final Production Recommendations

During Week 4 and Gate 5 hardening, core security controls have been fully implemented and verified:

| Area | Current Codebase Implementation (Week 4 / Gate 5) | Final Production Recommendation (Gate 5) |
|---|---|---|
| **Rate Limiting** | Multi-tier per-IP and per-reference rate limiting (`security.js`, `app.js`): arrival (5/15m), lookup (30/m), queue status (120/m). | Connect Redis-backed store if scaling across multi-container backend clusters. |
| **HTTP Security Headers** | Custom security headers middleware (`security.js`) setting X-Content-Type-Options, Frame protection, and Referrer policy. | Retain and expand Content Security Policy (CSP) when connecting third-party analytics. |
| **Staff Portal Auth** | Centralized JWT Bearer authentication with `bcryptjs` password hashing and strict RBAC matrix (`staffAuth.js`). | Optional: Integrate KNUST University SSO / SAML for campus credentials in future phases. |
| **Audit Logging** | MongoDB `AuditLog` collection tracking actorType, actorId, old/new times, and clinical cancellation/reschedule reasons. | Configure log forwarding to a centralized audit storage (e.g. AWS CloudWatch or Datadog). |
| **Transport Security** | TLS/HTTPS enforced on Vercel and Render staging deployments. | Ensure strict HSTS preloading on the custom domain before public campus launch. |
| **NoSQL Operator Sanitization** | Strict field-level casting (`validate.js`) plus global recursive middleware (`nosqlSanitizer` in `security.js`, `app.js`) stripping `$*`, `.*`, and prototype pollution keys. | Fully active in codebase; verified with 14 automated tests in `securitySanitize.test.js`. |
| **Public Display & Lookup Privacy** | Tokens only on waiting corridor screens (S10, Corridor TV, `/api/queue/activity`). Phone masking (`+233 24 **** 567`) and index masking (`2061****`) in public lookups. | Fully compliant with Ghana Data Protection Act (Act 843) principles of data minimization. |

