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

---

## 4. Secrets Management

- **Zero-Secret Repositories**: Real API keys (`MNOTIFY_API_KEY`, `AT_API_KEY`), database passwords, and private connection strings are strictly omitted from version control.
- **Gitignore Protection**: `.env` and `.env.local` files across `backend/`, `frontend/`, and `ui/prototype/` are listed in `.gitignore`.
- **Template Synchronization**: `.env.example` provides safe templates with dummy values and explanatory setup instructions.

---

## 5. Known Security Gaps & Production Recommendations

To elevate the platform to formal production compliance prior to university-wide launch, the following controls should be introduced:

| Area | Current Implementation | Production Recommendation |
|---|---|---|
| **Rate Limiting** | None | Add `express-rate-limit` to `/api/patients` (e.g., max 10 requests per minute per IP) to prevent enumeration of student records. |
| **HTTP Security Headers** | Basic Express defaults | Mount `helmet` middleware to enforce HSTS, X-Content-Type-Options, and Content Security Policy (CSP). |
| **Staff Portal Auth** | Demo role switcher (`S01SignIn.tsx`) | Implement university single sign-on (SSO) or institutional email OAuth / JWT authentication for clinical staff. |
| **Audit Logging** | Console logging | Integrate structured logging (e.g., Pino or Winston) shipping to an external log aggregator for clinical compliance auditing. |
| **Transport Security** | HTTP in local dev | Enforce TLS/HTTPS on all public endpoints via reverse proxy (Nginx / Cloudflare) with automated Let's Encrypt certificates. |
