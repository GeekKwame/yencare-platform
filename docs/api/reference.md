# YɛnCare REST API Specification

> **Official HTTP API Documentation for Backend Services**  
> Base URL (Local Development): `http://localhost:4000`  
> API Base Path: `/api`

---

## 1. Overview & General Conventions

The YɛnCare backend exposes a lightweight RESTful JSON API.

### Content Negotiation & Headers
- For all requests with a body, the client **must** set:
  ```http
  Content-Type: application/json
  ```
- All responses return standard JSON encoded in UTF-8.
- Maximum request payload size is restricted to **32 KB** (`express.json({ limit: '32kb' })`).

### Authentication & Authorization
- **Current Status**: Public access. No API bearer token or session cookie is required for patient registration and lookup endpoints.
- **Identifier Encoding**: When passing phone numbers with a leading `+` in URL paths (e.g. `+233247001122`), the `+` character **must** be URL-encoded as `%2B` (e.g., `/api/patients/%2B233247001122`).

---

## 2. Implemented Endpoints

### 2.1 Service Health Check

```http
GET /health
```

#### Purpose
Liveness and readiness probe for container orchestration, monitoring, and uptime checks.

#### Authentication
None.

#### Request Headers
None required.

#### Request Parameters / Body
None.

#### Success Response
- **Status Code**: `200 OK`
- **Body**:
  ```json
  {
    "ok": true,
    "service": "yencare-api"
  }
  ```

#### Example `curl`
```bash
curl -i http://localhost:4000/health
```

---

### 2.2 Patient Registration & Verification (Find-or-Create)

```http
POST /api/patients
```

#### Purpose
Used by the web frontend during booking (**Step 1/6: Your Details**) or by reception staff during walk-in intake. If a patient with the provided student index number or Ghana phone number already exists in MongoDB, the existing record is returned (`200 OK`). If no match is found, a new patient record is created (`201 Created`).

#### Authentication
None.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body Schema

| Field Name | Type | Required | Description & Validation Rules |
|---|---|---|---|
| `fullName` | `string` | Required to create | Full name of the patient (2 to 120 characters). Aliases: `full_name`, `patientName`. |
| `studentIndex`| `string` | Optional | KNUST student index number. If provided, must be **exactly 8 numeric digits** (e.g., `"20612345"`). Aliases: `student_index`. |
| `phoneNumber` | `string` | Required to create | Ghana telephone number. Accepted formats: `024 123 4567`, `0241234567`, `241234567`, `233241234567`, `+233241234567`. Stored in E.164 (`+233...`). Aliases: `phone_number`, `phone`. |
| `nhis` | `string` | Optional | National Health Insurance Scheme card number. Trimmed string. Aliases: `nhisNumber`, `nhis_number`. |

> [!NOTE]
> At least one identifier (`studentIndex` or `phoneNumber`) must be present in the request body for lookup. Creating a **new** patient also requires `fullName` and a valid `phoneNumber`.

#### Example Request Body (Student Booking)
```json
{
  "fullName": "Akosua Boateng",
  "studentIndex": "20612345",
  "phoneNumber": "024 123 4567",
  "nhis": "NHIS-992144"
}
```

#### Example Request Body (Walk-In without Student Index)
```json
{
  "fullName": "Kwame Ofori Atta",
  "phoneNumber": "+233245551234"
}
```

#### Success Responses

**1. Newly Created Patient (`201 Created`):**
```json
{
  "id": "66dd8f1a2b0c3d0012e45678",
  "fullName": "Akosua Boateng",
  "studentIndex": "20612345",
  "phoneNumber": "+233241234567",
  "nhis": "NHIS-992144",
  "createdAt": "2026-09-08T14:30:00.000Z",
  "updatedAt": "2026-09-08T14:30:00.000Z"
}
```

**2. Existing Patient Matched (`200 OK`):**
Returns identical JSON structure with the existing database `id` and timestamps.

#### Error Responses

- **`400 Bad Request`**: Validation error (e.g. invalid phone number, non-8-digit student index, missing mandatory create fields):
  ```json
  {
    "error": "Enter a valid Ghana phone number (e.g. 024 123 4567)"
  }
  ```
- **`409 Conflict`**: The supplied `studentIndex` belongs to one existing patient record, but the `phoneNumber` belongs to a different existing patient record:
  ```json
  {
    "error": "The student index number and phone number belong to different registered records"
  }
  ```
- **`500 Internal Server Error`**: Unexpected server fault:
  ```json
  {
    "error": "Internal server error"
  }
  ```

#### Example `curl`
```bash
curl -i -X POST http://localhost:4000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Akosua Boateng","studentIndex":"20612345","phoneNumber":"024 123 4567"}'
```

---

### 2.3 Patient Lookup by Identifier

```http
GET /api/patients/:identifier
```

#### Purpose
Used on the Find Appointment screen (**P09**) or reception search. Looks up a patient by their 8-digit KNUST student index number or their Ghana phone number.

#### Authentication
None.

#### URL Parameters
- `identifier` (`string`, required): Either:
  - An 8-digit student index (e.g., `20612345`)
  - A local Ghana mobile number (e.g., `0241234567`)
  - A URL-encoded E.164 Ghana phone number (e.g., `%2B233241234567`)

#### Success Response
- **Status Code**: `200 OK`
- **Body**:
  ```json
  {
    "id": "66dd8f1a2b0c3d0012e45678",
    "fullName": "Akosua Boateng",
    "studentIndex": "20612345",
    "phoneNumber": "+233241234567",
    "nhis": "NHIS-992144",
    "createdAt": "2026-09-08T14:30:00.000Z",
    "updatedAt": "2026-09-08T14:30:00.000Z"
  }
  ```

#### Error Responses
- **`400 Bad Request`**: Unusable identifier format:
  ```json
  {
    "error": "Enter an 8-digit student index or a Ghana phone number"
  }
  ```
- **`404 Not Found`**: No patient matches the identifier:
  ```json
  {
    "error": "Patient not found"
  }
  ```

#### Example `curl`
```bash
# Lookup by Student Index
curl -i http://localhost:4000/api/patients/20612345

# Lookup by Local Phone
curl -i http://localhost:4000/api/patients/0241234567

# Lookup by E.164 Phone (+ encoded as %2B)
curl -i http://localhost:4000/api/patients/%2B233241234567
```

---

## 3. Client Integration Service Examples (JavaScript)

### 3.1 Patient Service Wrapper (`frontend/src/services/patients.js`)

```javascript
import api from "./api";

/**
 * Register a new patient or look up an existing record.
 * @param {Object} data - { fullName, studentIndex, phoneNumber, nhis }
 */
export async function registerPatient(data) {
  const response = await api.post("/patients", data);
  return response.data;
}

/**
 * Look up a patient by student index or telephone number.
 * @param {string} identifier - 8-digit index or Ghana phone
 */
export async function lookupPatient(identifier) {
  const response = await api.get(`/patients/${encodeURIComponent(identifier)}`);
  return response.data;
}
```

---

## 4. Planned & Future Endpoints (Design Contracts)

The following endpoints are defined in architecture specifications and frontend client stubs (`frontend/src/services/appointments.js`), with schema models already committed in `backend/src/models/`:

### 4.1 Create Appointment (`POST /api/appointments`) — Planned
- **Purpose**: Creates an appointment reservation linked to an existing `patientId`, `timeSlotId`, `clinicianId`, and `roomId`.
- **Expected Payload**:
  ```json
  {
    "patientId": "66dd8f1a2b0c3d0012e45678",
    "clinicSite": "students-clinic",
    "clinicianId": "66dd8f1a2b0c3d0012e45111",
    "timeSlotId": "66dd8f1a2b0c3d0012e45222",
    "visitType": "general-opd"
  }
  ```
- **Target Response**: `201 Created` with generated `referenceCode` (`YC-4821`).

### 4.2 Query Live Queue (`GET /api/queue`) — Planned
- **Purpose**: Retrieves the real-time queue roster partitioned by `clinicSite` for display boards and patient queue monitors.
- **Target Response**: Active consultation tokens in Room 1 and Room 2, plus sorted array of waiting queue tokens.
