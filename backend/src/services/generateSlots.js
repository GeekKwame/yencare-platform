import { Clinician } from '../models/Clinician.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { accraTodayIso, upcomingWeekdays } from '../lib/accraTime.js';

export const OPEN_TIMES = [
  { startTime: '08:30', endTime: '09:00' },
  { startTime: '09:00', endTime: '09:30' },
  { startTime: '09:30', endTime: '10:00' },
  { startTime: '10:00', endTime: '10:30' },
  { startTime: '10:30', endTime: '11:00' },
  { startTime: '11:00', endTime: '11:30' },
  { startTime: '11:30', endTime: '12:00' },
  { startTime: '14:00', endTime: '14:30' },
  { startTime: '14:30', endTime: '15:00' },
];

/**
 * Create unbooked weekday OPD slots for every clinician, skipping existing rows.
 *
 * @param {{ days?: number, fromDate?: string }} [options]
 */
export async function ensureOpenSlots({ days = 14, fromDate } = {}) {
  const start = fromDate || accraTodayIso();
  const dates = upcomingWeekdays(start, days);
  const clinicians = await Clinician.find({ available: true }).populate('roomId');

  let created = 0;
  let skipped = 0;

  for (const clinician of clinicians) {
    const roomId = clinician.roomId?._id || clinician.roomId;
    if (!roomId) continue;

    for (const date of dates) {
      for (const time of OPEN_TIMES) {
        const existing = await TimeSlot.findOne({
          clinicianId: clinician._id,
          date,
          startTime: time.startTime,
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        await TimeSlot.create({
          clinicianId: clinician._id,
          roomId,
          clinicSite: clinician.clinicSite,
          date,
          startTime: time.startTime,
          endTime: time.endTime,
          isBooked: false,
          appointmentId: null,
        });
        created += 1;
      }
    }
  }

  return { ok: true, created, skipped, dates };
}
