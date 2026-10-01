import { Clinician } from '../models/Clinician.js';
import { TimeSlot } from '../models/TimeSlot.js';
import {
  accraTodayIso,
  CLINIC_CONFIG,
  upcomingCalendarDays,
  upcomingWeekdays,
} from '../lib/accraTime.js';

export const OPEN_TIMES = CLINIC_CONFIG['students-clinic'].slotTimes;

/**
 * Create unbooked slots for every clinician according to clinic operating schedule.
 * Students' Clinic gets weekday slots (08:00-16:00).
 * KNUST Hospital gets all-day / weekend slots per 24-hour availability.
 *
 * @param {{ days?: number, fromDate?: string }} [options]
 */
export async function ensureOpenSlots({ days = 14, fromDate } = {}) {
  const start = fromDate || accraTodayIso();
  const clinicians = await Clinician.find({ available: true }).populate('roomId');

  let created = 0;
  let skipped = 0;
  const datesUsed = new Set();

  for (const clinician of clinicians) {
    const roomId = clinician.roomId?._id || clinician.roomId;
    if (!roomId) continue;

    const site = clinician.clinicSite || 'students-clinic';
    const config = CLINIC_CONFIG[site] || CLINIC_CONFIG['students-clinic'];
    const dates = config.allDay
      ? upcomingCalendarDays(start, days)
      : upcomingWeekdays(start, days);

    dates.forEach((d) => datesUsed.add(d));
    const slotTimes = config.slotTimes;

    for (const date of dates) {
      for (const time of slotTimes) {
        const existing = await TimeSlot.findOne({
          $or: [
            { clinicianId: clinician._id, date, startTime: time.startTime },
            { roomId, date, startTime: time.startTime },
          ],
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        await TimeSlot.create({
          clinicianId: clinician._id,
          roomId,
          clinicSite: site,
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

  return { ok: true, created, skipped, dates: Array.from(datesUsed).sort() };
}
