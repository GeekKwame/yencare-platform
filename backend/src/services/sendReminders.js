import { Appointment } from '../models/Appointment.js';
import { resolveSmsDestination } from '../patients/fields.js';
import { sendSms } from '../sms/sendSms.js';
import { accraTomorrowIso } from '../lib/accraTime.js';

function siteLabel(clinicSite) {
  return clinicSite === 'knust-hospital'
    ? 'KNUST Hospital'
    : "KNUST Students' Clinic";
}

function formatHm(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || '';
  const [hour, minute] = hhmm.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * SMS reminders for BOOKED appointments on the next Accra weekday.
 *
 * @param {{ date?: string }} [options]
 */
export async function sendAppointmentReminders({ date } = {}) {
  const appointmentDate = date || accraTomorrowIso();
  const appointments = await Appointment.find({
    appointmentDate,
    status: 'BOOKED',
    $or: [{ reminderSentAt: null }, { reminderSentAt: { $exists: false } }],
  })
    .populate('patientId', 'fullName phone studentIndex')
    .populate('clinicianId', 'name title')
    .populate('roomId', 'name clinicSite');

  let sent = 0;
  let failed = 0;

  for (const appointment of appointments) {
    const patient =
      appointment.patientId && typeof appointment.patientId === 'object'
        ? appointment.patientId
        : null;
    const phone = resolveSmsDestination(patient);
    if (!phone) {
      failed += 1;
      continue;
    }

    const clinicianName = appointment.clinicianId?.name || 'your clinician';
    const message = [
      'YɛnCare reminder',
      '',
      `Appointment ${appointment.referenceCode} is tomorrow, ${appointmentDate} at ${formatHm(appointment.appointmentTime)}.`,
      `${clinicianName} · ${siteLabel(appointment.clinicSite)}`,
      'Please arrive 15 minutes early and bring your KNUST student ID.',
    ].join('\n');

    const result = await sendSms(phone, message);
    if (result.ok) {
      appointment.reminderSentAt = new Date();
      await appointment.save();
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return {
    ok: true,
    appointmentDate,
    candidates: appointments.length,
    sent,
    failed,
  };
}
