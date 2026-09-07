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
  "KNUST Students' Clinic\n\nAppointment Confirmed\nTue 15 Sep, 9:30 AM\nRef: YC-4821\nArrive by 9:15 AM";

const result = await sendSms(to, message);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
