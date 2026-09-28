# Environment Variables Reference

> **Comprehensive Audit of All Configuration Flags & Credentials**

---

## 1. Overview & Security Rules

All environment configuration files are strictly separated by layer. 

### Critical Security Rules
1. **Never Commit Secrets**: Real credentials (`MNOTIFY_API_KEY`, `AT_API_KEY`, Atlas database passwords) **must never be committed to Git**.
2. **Gitignore Enforcement**: Both `backend/.env` and `frontend/.env` are registered in `.gitignore`.
3. **Always Update Templates**: If an engineer introduces a new `process.env.*` or `import.meta.env.*` variable, they must document it here and add an empty or safe placeholder in `backend/.env.example` or `frontend/.env.example`.

---

## 2. Backend Environment Variables (`backend/.env`)

These variables configure the Express server, MongoDB connection, and third-party SMS providers:

| Variable | Required | Default | Scope | Purpose & Description | Safe Example |
|---|---|---|---|---|---|
| `PORT` | No | `4000` | Server | TCP port on which the Express HTTP server listens. | `4000` |
| `MONGODB_URI` | **Yes** (to start API) | `mongodb://127.0.0.1:27017/yencare` | Database | Full MongoDB connection string. Supports local instances and MongoDB Atlas SRV URIs. | `mongodb://127.0.0.1:27017/yencare` |
| `MONGO_MIN_POOL_SIZE` | No | `10` | Database | Minimum sockets kept in the Mongoose pool (prevents cold-start starvation). | `10` |
| `MONGO_MAX_POOL_SIZE` | No | `50` | Database | Maximum sockets in the Mongoose pool. Stay at 50 or below on a single staging API instance. | `50` |
| `CORS_ORIGIN` | Staging **Yes** | *YɛnCare Vercel hosts* | HTTP | Extra comma-separated browser origins. Canonical staging frontend: `https://yencare-platform.vercel.app`. | `https://yencare-platform.vercel.app` |
| `CORS_ALLOW_VERCEL_PREVIEWS` | No | `true` | HTTP | When not `"false"`, allow `https://yencare-platform*.vercel.app` preview URLs. | `true` |
| `SMS_PROVIDER` | No | `mock` | SMS | Delivery provider for outbound SMS. Valid options: `mock` (terminal logs), `mnotify` (real Ghana phones), or `africastalking` (AT sandbox). | `mock` |
| `MNOTIFY_API_KEY` | Conditional | *Empty* | SMS (mNotify) | Required when `SMS_PROVIDER=mnotify`. API v2 key generated from the mNotify dashboard. If empty, the system logs a warning and falls back to `mock`. | `ak_live_xyz123abc456` |
| `MNOTIFY_SENDER_ID` | No | `YenCare` | SMS (mNotify) | Registered SMS sender alphanumeric header (max 11 characters). Must be approved in the mNotify dashboard. | `YenCare` |
| `MNOTIFY_API_URL` | No | `https://api.mnotify.com/api/sms/quick` | SMS (mNotify) | Endpoint for mNotify Quick SMS. Defaults to official API v2 endpoint. | `https://api.mnotify.com/api/sms/quick` |
| `AT_USERNAME` | Conditional | `sandbox` | SMS (AT) | Africa's Talking account username. For testing, always set to `sandbox`. | `sandbox` |
| `AT_API_KEY` | Conditional | *Empty* | SMS (AT) | Required when `SMS_PROVIDER=africastalking`. Generated under your Africa's Talking sandbox app. | `atsk_test_987654321` |
| `AT_SENDER_ID` | No | *Empty* | SMS (AT) | Custom sender ID or shortcode for Africa's Talking (if configured). | *Empty* |
| `PUBLIC_LOOKUP_RATE_MAX` | No | `30` | Rate limit | Requests per minute per IP for the reference-code endpoints (`GET /api/appointments/:reference`, `GET /api/appointments/lookup`, cancel, reschedule and the OTP requests). | `30` |
| `QUEUE_STATUS_RATE_MAX` | No | `120` | Rate limit | Requests per minute per IP for `GET /api/appointments/:reference/queue-status` (polled by the queue page). | `120` |
| `QUEUE_STATUS_REFERENCE_RATE_MAX` | No | `30` | Rate limit | Requests per minute per IP + reference for queue status, so one code cannot be hammered. | `30` |
| `ARRIVAL_RATE_MAX` | No | `30` | Rate limit | Requests per 15 minutes per IP for patient arrival (`POST /api/appointments/arrive` and `/:reference/arrive`). | `30` |
| `ARRIVAL_REFERENCE_RATE_MAX` | No | `5` | Rate limit | Arrival attempts per 15 minutes per IP + reference (brute-force defence). | `5` |
| `PATIENT_REGISTER_RATE_MAX` | No | `10` | Rate limit | Public `POST /api/patients` requests per 15 minutes per IP. Requests with a verified receptionist/admin token skip this limit and do not count toward it. | `10` |
| `RATE_LIMIT_DISABLED` | No | *Unset* (limits on) | Rate limit | Set to `true` to turn rate limiting off, for local load testing only. **Ignored when `NODE_ENV=production`** (including Render staging): limits stay on there and can only be raised with the `*_RATE_MAX` variables. Limits are also off automatically during test runs (`NODE_ENV=test` or `node --test`). | *Unset* |

---

## 3. Frontend Environment Variables (`frontend/.env`)

These variables configure the React 19 web client bundle via Vite:

| Variable | Required | Default | Purpose & Description | Safe Example |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** (for live API calls) | `http://localhost:4000/api` | Base URL used by Axios (`frontend/src/services/api.js`) for all backend REST calls. Must include `/api` suffix. Set this in the Vercel project for Production and Preview. | `https://yencare-api-staging.onrender.com/api` |

---

## 4. Environment Verification & Fallbacks

- **Zero-Config Offline Development**: Setting `SMS_PROVIDER=mock` and running Docker Compose allows full offline development with zero external API dependencies or paid SMS charges.
- **Provider Fallback Protection**: If `SMS_PROVIDER=mnotify` is set but `MNOTIFY_API_KEY` is missing or empty, `sendSms()` automatically logs a descriptive terminal message and falls back to `mock` delivery rather than crashing the Express server.
