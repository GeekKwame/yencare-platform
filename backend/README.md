# YɛnCare SMS (`sendSms`)

Reusable backend wrapper for Gate 2 confirmation texts. **Able** (appointments API) and **Emmanuella** (patient registration / trigger SMS on book) should import `sendSms()` and not call mNotify or Africa's Talking themselves.

This is the only SMS surface the backend should use.

| | |
|---|---|
| Live provider | **mNotify** — real Ghana handsets |
| Offline | `SMS_PROVIDER=mock` |
| Optional | Africa's Talking sandbox |
| Module type | ESM (`"type": "module"`). Use `import`, not `require` |

The React prototype `SmsModal` is a **UI fake log**. It is not this module.

---

## Import

From another file inside `backend/src/` (for example a booking route):

```js
import { sendSms } from './sms/sendSms.js';

const result = await sendSms(patient.phone, [
  'YenCare Health',
  '',
  'Appointment Confirmed',
  'Tue 15 Sep, 9:30 AM',
  'Booking ID: YC-4821',
  'Arrive by 9:15 AM',
].join('\n'));

if (!result.ok) {
  console.error('SMS not delivered', result.error);
}
```

Package root:

```js
import { sendSms, normalizeGhanaPhone } from 'yencare-backend';
```

Load environment variables in the Express entry file **before** calling `sendSms`.

---

## Contract

```ts
sendSms(to: string, message: string) => Promise<SmsResult>
```

| Argument | Required | Accepted forms |
|---|---|---|
| `to` | Yes | `024 123 4567`, `0241234567`, `241234567`, `233241234567`, `+233241234567` |
| `message` | Yes | Non-empty string. Keep confirmation SMS short (≤160 chars). |

`to` is stored/returned as E.164 (`+233…`). mNotify is sent the local form (`024…`). Empty `to` or `message` **throws**. Provider failures return `{ ok: false }` so booking can still succeed.

---

## Modes

| `SMS_PROVIDER` | Keys | What happens | Where you see it |
|---|---|---|---|
| `mock` | None | Logs to the terminal | Terminal |
| `mnotify` | `MNOTIFY_API_KEY` | POST to mNotify Quick SMS | Real phone + mNotify reports |
| `mnotify` | Missing key | Warns and falls back to mock | Terminal |
| `africastalking` | `AT_API_KEY` | AT sandbox | Simulator / AT dashboard |

---

## mNotify (live Ghana SMS)

1. Sign up at [mnotify.com](https://www.mnotify.com/). New accounts often get about **50 free SMS**.
2. Dashboard → account menu → **API v2** → **Create API Key**.
3. Register sender ID **`YenCare`** (max 11 characters). Sending can fail until it is approved.
4. Put the key in `backend/.env` (never commit this file):

```env
SMS_PROVIDER=mnotify
MNOTIFY_API_KEY=paste-the-key-here
MNOTIFY_SENDER_ID=YenCare
```

5. Send to a real number:

```bash
npm run sms:test -- +233536064409
```

6. Check that handset. Delivery reports: mNotify dashboard.

Each extra test after the free units costs a few pesewas. Use `SMS_PROVIDER=mock` for offline work.

Docs: [readthedocs.mnotify.com](https://readthedocs.mnotify.com/)

---

## Local mock (offline)

```bash
cd backend
copy .env.example .env
```

Set `SMS_PROVIDER=mock`, then `npm test` and `npm run sms:test`.

---

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/yencare` | Local MongoDB for Gate 2 |
| `SMS_PROVIDER` | `mock` | `mock`, `mnotify`, or `africastalking` |
| `MNOTIFY_API_KEY` | empty | mNotify API v2 key |
| `MNOTIFY_SENDER_ID` | `YenCare` | Max 11 chars; must be registered |
| `AT_USERNAME` | `sandbox` | Only if using Africa's Talking |
| `AT_API_KEY` | empty | AT sandbox key |

Share keys with Able and Emmanuella privately. Do not put them in git.

---

## Hooking this into booking (Able / Emmanuella)

1. Save the appointment first.
2. Call `await sendSms(phone, confirmationBody)`.
3. If `result.ok === false`, log `result.error` and still return HTTP 201 with `YC-4821`.
4. Web confirmation is the source of truth — do not block on SMS.

---

## Troubleshooting

| Symptom | What to check |
|---|---|
| Falls back to mock | `MNOTIFY_API_KEY` is empty |
| mNotify 401 / invalid key | Generate the key under **API v2**, not an old v1 key |
| Sender ID rejected | Register `YenCare` in the dashboard and wait for approval |
| No text on the phone | Number must be a real Ghana mobile; check mNotify delivery report |
| `Invalid Ghana phone` | Use `024…` or `+233…`, not `024 XXX XXXX` |

---

## Database (MongoDB)

Schemas, indexes, `YC-XXXX` codes, and seed data live under `src/models` and `src/db`. Full write-up: [`docs/DATABASE_ARCHITECTURE.md`](./docs/DATABASE_ARCHITECTURE.md).

```bash
npm run db:migrate:dry
npm run db:migrate
npm run db:seed
```

Able and Emmanuella should import models from `src/models/index.js` (or `yencare-backend/models`) and allocate codes with `generateReferenceCode` / `Appointment` pre-validate. Do not invent a second reference-code format.

## Layout

```
backend/
├── README.md
├── docs/DATABASE_ARCHITECTURE.md
├── .env.example
├── scripts/send-test-sms.js
├── scripts/migrate.js
├── scripts/seed.js
├── src/index.js
├── src/db/
├── src/models/
├── src/utils/referenceCode.js
└── src/sms/
    ├── sendSms.js
    ├── normalizePhone.js
    └── providers/
        ├── mock.js
        ├── mnotify.js
        └── africastalking.js
```
