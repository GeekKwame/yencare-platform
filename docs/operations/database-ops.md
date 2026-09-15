# Database Operations & Maintenance Runbook

> **MongoDB Lifecycle, Schema Migrations, Index Verification & Seed Data Management**

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

Data is stored persistently in the Docker volume `backend_yencare_mongo` (or `yencare_mongo`).

---

## 2. Running Schema Migrations (`migrate.js`)

Database migrations apply formal collection JSON Schema validators and ensure all required unique, compound, and sparse indexes are registered in MongoDB.

### 2.1 Dry-Run Verification
To inspect planned index changes without touching the database:

```bash
npm run db:migrate:dry
```

Output:
```text
[migrate] dry-run patients (2 indexes)
[migrate] would ensure index patients_phone_unique on patients
[migrate] would ensure index patients_studentIndex_unique on patients
...
```

### 2.2 Applying Migrations
To execute changes against your active MongoDB instance:

```bash
npm run db:migrate
```

The migration runner is **strictly idempotent**: running it multiple times will not duplicate indexes or disrupt existing data.

---

## 3. Managing Seed Data (`seed.js`)

The seed script loads realistic demonstration data into the database for local development and stakeholder demonstrations:

### Seed Content
- **Rooms**:
  - `Room 1` (Students' Clinic · Ground Floor)
  - `Room 2` (Students' Clinic · Ground Floor)
  - `Consultation Room GF7` (Social Science Block GF7)
- **Clinicians**:
  - `Dr. Kwame Boateng` (Senior Medical Officer, assigned to Room 1)
  - `Dr. Ama Serwaa` (Medical Officer, assigned to Room 2)
- **Sample Patients**:
  - `Akosua Boateng` (`20612345`, `+233241234567`)
  - `Yaw Boateng` (`20615500`, `+233245550000`)
  - `Kweku Mensah` (`20619022`, `+233244441122`)
- **Demo Calendar Schedule**:
  - September 15, 2026 30-minute consultation slots (11:00, 11:30) and sample booked appointments.

### 3.1 Executing the Seed
```bash
# Verify seed payloads without connecting
npm run db:seed:dry

# Apply seed data to MongoDB
npm run db:seed
```

After seed, copy ObjectIds for Postman booking bodies from `GET /api/rooms`, `GET /api/clinicians`, and `GET /api/time-slots?date=2026-09-15&available=true`.

---

## 4. Troubleshooting Index Conflicts

If MongoDB returns `IndexKeySpecsConflict` (e.g. attempting to create an index with the same name but different options, or matching keys with differing uniqueness rules):

1. Run the built-in conflict detector in dry-run mode:
   ```bash
   node backend/scripts/migrate.js --dry-run
   ```
2. If conflicts are detected between an existing index and the migration definition, connect to the database via `mongosh` and inspect active indexes:
   ```bash
   mongosh "mongodb://127.0.0.1:27017/yencare" --eval "db.appointments.getIndexes()"
   ```
3. Drop the conflicting index if safe:
   ```javascript
   db.appointments.dropIndex("conflicting_index_name")
   ```
4. Re-run `npm run db:migrate` to recreate the canonical index specification.
