# Database Operations & Maintenance Runbook

> **MongoDB Lifecycle, Schema Migrations, Connection Pooling & Startup Validation**

---

## 1. Local Database Management

### 1.1 Starting MongoDB via Docker Compose
The backend includes a pre-configured `docker-compose.yml` file running official `mongo:7`:

```bash
# Start MongoDB in the background
docker compose -f backend/docker-compose.yml up -d

# Check status and healthcheck
docker compose -f backend/docker-compose.yml ps

# View database container logs
docker compose -f backend/docker-compose.yml logs -f mongo

# Stop MongoDB container
docker compose -f backend/docker-compose.yml down
```

Data is stored persistently in the Docker volume `backend_yencare_mongo`.

---

## 2. Startup Environment Validator (`config/env.js`)

The YenCare backend enforces fail-fast configuration verification on startup:

### 2.1 Critical Environment Variables
| Variable | Required | Description & Validation |
|---|---|---|
| `PORT` | Optional (default: 4000) | Valid integer between 1 and 65535. |
| `MONGODB_URI` / `MONGO_URI` | **Required** | Must start with `mongodb://` or `mongodb+srv://`. |
| `JWT_SECRET` | **Required** | Secret for signing staff JWTs. In production, placeholder strings (`change-me-in-staging`, `yencare-dev-jwt-secret`) are strictly rejected. |
| `MNOTIFY_API_KEY` / `MNOTIFY_KEY` | Required in Prod | Valid mNotify Ghana SMS API v2 Key. Required when `SMS_PROVIDER=mnotify` or in production. |
| `MONGO_MIN_POOL_SIZE` | Optional (default: 10) | Minimum sockets maintained in the connection pool. |
| `MONGO_MAX_POOL_SIZE` | Optional (default: 50) | Maximum sockets allocated under concurrency. |

If critical settings are missing or malformed, the process halts immediately with a formatted ASCII diagnostic banner showing exact error details and required remediation actions.

---

## 3. Connection Pooling Architecture

To prevent socket starvation under clinic peak traffic (such as morning check-in rushes):

```javascript
// backend/src/db/connection.js
const min = Number(process.env.MONGO_MIN_POOL_SIZE || 10);
const max = Number(process.env.MONGO_MAX_POOL_SIZE || 50);

await mongoose.connect(uri, {
  minPoolSize: min,
  maxPoolSize: max,
  serverSelectionTimeoutMS: 5000,
});
```

- **Health Probe**: `GET /health` executes a lightweight `ping` command against the active connection pool, reporting latency in milliseconds (`latencyMs`).

---

## 4. Running Schema Migrations (`migrate.js`)

Database migrations apply formal collection JSON Schema validators and ensure all required unique, compound, and sparse indexes are registered in MongoDB.

### 4.1 Dry-Run Verification
To inspect planned index changes without touching the database:

```bash
npm run db:migrate:dry
```

### 4.2 Applying Migrations
```bash
npm run db:migrate
```

The migration runner is **strictly idempotent**: running it multiple times will not duplicate indexes or disrupt existing data.

---

## 5. Managing Seed Data (`seed.js`)

The seed script loads realistic clinical demonstration data:

### Seed Content
- **Facilities & Rooms**: Room 1, Room 2 (KNUST Students' Clinic); OPD Room 1, OPD Room 2 (KNUST Hospital).
- **Clinicians**: Dr. Kwame Boateng (Senior Medical Officer · Room 1 / OPD Room 1), Dr. Ama Serwaa (Medical Officer · Room 2 / OPD Room 2).
- **Demo Patients**: Akosua Boateng, Yaw Boateng, Kweku Mensah.
- **Time Slots**: 30-minute consultation slots across current and upcoming weekdays.

### Executing Seed
```bash
# Verify seed payloads
npm run db:seed:dry

# Apply seed data to MongoDB
npm run db:seed
```
