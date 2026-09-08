#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sendSms } from '../src/sms/sendSms.js';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const to = process.argv[2] || '+233241234567';
const message =
  process.argv.slice(3).join(' ') ||
  'YenCare Health: Your appointment is booked for Tue 15 Sep at 9:30 AM. Booking ID: YC4821. Please arrive 15 minutes early.';

const result = await sendSms(to, message);
console.log(JSON.stringify(result, null, 2));

if (result.ok && result.provider === 'mnotify') {
  console.log(`
mNotify delivers to a real Ghana handset. Check ${result.to} (local form is fine on the phone).
Sender ID must be approved in the mNotify dashboard (default YenCare).
`);
}

if (result.ok && result.provider === 'africastalking') {
  console.log(`
Open the sandbox phone BEFORE you send, using this exact number: ${result.to}
1. https://simulator.africastalking.com:1517/
2. Enter ${result.to} → Launch
3. Tap Messages / SMS on the fake phone
4. Run this command again if the phone was not already open
`);
}

process.exit(result.ok ? 0 : 1);
