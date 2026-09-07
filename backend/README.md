# YɛnCare SMS (`sendSms`)

Reusable backend wrapper for Gate 2 confirmation texts. **Able** (appointments API) and **Emmanuella** (patient registration / trigger SMS on book) should import `sendSms()` and not call Africa's Talking or Hubtel themselves.

This is the only SMS surface the backend should use.

| | |
|---|---|
| Cost | **Free** (mock + Africa's Talking sandbox) |
| Real handset? | **No.** Sandbox messages appear in the [AT simulator](https://simulator.africastalking.com:1517/) |
| Offline? | Yes — default `SMS_PROVIDER=mock` |
| Module type | ESM (`"type": "module"`). Use `import`, not `require` |

The React prototype `SmsModal` is a **UI fake log**. It is not this module.

---

## Import

From another file inside `backend/src/` (for example a booking route):

```js
import { sendSms } from './sms/sendSms.js';

const result = await sendSms(patient.phone, [
  "KNUST Students' Clinic",
  '',
  'Appointment Confirmed',
  'Tue 15 Sep, 9:30 AM',
  'Ref: YC-4821',
  'Arrive by 9:15 AM',
].join('\n'));

// Booking must still succeed if SMS fails
if (!result.ok) {
  console.error('SMS not delivered', result.error);
}
```

Package root:

```js
import { sendSms, normalizeGhanaPhone } from 'yencare-backend';
```

Load environment variables in the Express entry file (`dotenv/config` or `dotenv.config()`) **before** calling `sendSms`. The wrapper reads `process.env`; it does not load `.env` itself.

---

## Contract

```ts
sendSms(to: string, message: string) => Promise<SmsResult>
```

### Arguments

| Argument | Required | Accepted forms |
|---|---|---|
| `to` | Yes | `024 123 4567`, `0241234567`, `241234567`, `233241234567`, `+233241234567` |
| `message` | Yes | Non-empty string. Keep confirmation SMS short (one GSM segment ≈ 160 chars). |

`to` is normalised to E.164 (`+233XXXXXXXXX`) before send. Empty `to` or `message` **throws**.

### Result

Provider failures do **not** throw. They return `{ ok: false }` so a booking can still be saved.

**Success (mock)**

```json
{
  "ok": true,
  "provider": "mock",
  "to": "+233241234567",
  "messageId": "mock-1788802387571"
}
```

**Success (Africa's Talking sandbox)**

```json
{
  "ok": true,
  "provider": "africastalking",
  "to": "+233241234567",
  "messageId": "ATXid_...",
  "status": "Success"
}
```

**Provider failure (do not roll back the booking)**

```json
{
  "ok": false,
  "provider": "africastalking",
  "to": "+233241234567",
  "error": "The supplied authentication is invalid"
}
```

| Situation | Behaviour |
|---|---|
| Invalid / empty phone | **Throws** `Error` |
| Empty message | **Throws** `Error` |
| Missing `AT_API_KEY` while `SMS_PROVIDER=africastalking` | Warns, sends via **mock**, `{ ok: true }` |
| AT / network error | `{ ok: false, error }` |

---

## Modes (all free)

| `SMS_PROVIDER` | Keys | What happens | How you “receive” it |
|---|---|---|---|
| `mock` (default) | None | Logs `[SMS mock] to=+233…` to the terminal | Terminal / CI output |
| `africastalking` | `AT_API_KEY` | POST to AT sandbox | [Simulator inbox](https://simulator.africastalking.com:1517/) |
| `africastalking` | Missing key | Warns and falls back to mock | Terminal |

Do not create a live AT or Hubtel account for this task. Live SMS to a real Ghana number costs money.

---

## Local mock (offline)

From the repo root:

```bash
cd backend
copy .env.example .env
npm install
npm test
npm run sms:test
```

On macOS/Linux use `cp .env.example .env`. You should see `[SMS mock] to=+233241234567` and JSON with `"provider": "mock"`.

From the repo root you can also run `npm run sms:test` and `npm run test:sms`.

Optional number and body:

```bash
npm run sms:test -- +233551234567 "YɛnCare sandbox test"
```

---

## Africa's Talking simulator (still free)

Sandbox traffic never reaches MTN, Telecel, or AirtelTigo. The simulator **is** the phone.

1. Sign up at [AT sandbox](https://account.africastalking.com/apps/sandbox) (free).
2. Settings → API Key → generate a key. Username is always `sandbox`.
3. Put the key in `backend/.env` (never commit this file):

```env
SMS_PROVIDER=africastalking
AT_USERNAME=sandbox
AT_API_KEY=paste-the-key-here
```

4. Open [https://simulator.africastalking.com:1517/](https://simulator.africastalking.com:1517/).
5. Register **the same** E.164 number you will send to (e.g. `+233241234567`) and launch.
6. Run `npm run sms:test -- +233241234567`.
7. Open **SMS** in the simulator. That inbox is the proof the message was received.

Use the same number in code and in the simulator. `0241234567` in the UI becomes `+233241234567` after normalisation — register `+233241234567`.

For a Gate 2 recording: split the screen (CLI or booking request on one side, simulator inbox on the other).

---

## Environment

Copy [`.env.example`](./.env.example). `.env` is gitignored.

| Variable | Default | Purpose |
|---|---|---|
| `SMS_PROVIDER` | `mock` | `mock` or `africastalking` |
| `AT_USERNAME` | `sandbox` | Must stay `sandbox` for this project |
| `AT_API_KEY` | empty | Sandbox API key (shown once when generated) |
| `AT_SENDER_ID` | empty | Leave blank unless you created a sandbox sender ID |

Share the API key with Able and Emmanuella privately (chat/email). Do not put it in git, PR descriptions, screenshots of `.env`, or the frontend.

---

## Hooking this into booking (Able / Emmanuella)

1. Save the appointment to PostgreSQL first.
2. Call `await sendSms(phone, confirmationBody)`.
3. If `result.ok === false`, log `result.error` and still return HTTP 201 with the reference code (`YC-4821`).
4. Do not wait on the AT simulator to respond to the patient web UI. Web confirmation is the source of truth.

Suggested confirmation body (keep it short):

```text
KNUST Students' Clinic
Appointment Confirmed
Tue 15 Sep, 9:30 AM
Ref: YC-4821
Arrive by 9:15 AM
```

---

## Troubleshooting

| Symptom | What to check |
|---|---|
| `Invalid Ghana phone` | Number must be a Ghana mobile (`024…` / `+233…`). Prototype placeholders like `024 XXX XXXX` will throw. |
| `The supplied authentication is invalid` | Sandbox username must be `sandbox` and the key must be the **sandbox** key, not a live account key. |
| Nothing in the simulator | The launched simulator number must match the normalised `to` (`+233…`). Keep the simulator tab open, then send. |
| Offline / no keys | Leave `SMS_PROVIDER=mock`. Mock does not need the internet. |
| Booking route uses `require()` | This package is ESM. Use `import { sendSms } from './sms/sendSms.js'`. |

---

## Layout

```
backend/
├── README.md
├── .env.example
├── package.json
├── scripts/send-test-sms.js      # npm run sms:test
├── src/index.js                  # re-exports sendSms, normalizeGhanaPhone
├── src/sms/sendSms.js            # import this
├── src/sms/normalizePhone.js
├── src/sms/providers/mock.js
├── src/sms/providers/africastalking.js
└── test/
```
