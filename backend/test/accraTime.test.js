import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accraTodayIso,
  accraWeekday,
  clinicHoursLabel,
  isClinicOpen,
  isClinicOpenAt,
} from '../src/lib/accraTime.js';

describe('accra clinic hours', () => {
  it('keeps KNUST Hospital open overnight', () => {
    const sundayNight = new Date('2026-09-20T02:00:00.000Z');
    assert.equal(isClinicOpen('knust-hospital', sundayNight), true);
  });

  it('closes Students’ Clinic on Sunday in Accra', () => {
    const sundayNoonUtc = new Date('2026-09-20T12:00:00.000Z');
    assert.equal(isClinicOpen('students-clinic', sundayNoonUtc), false);
  });

  it('returns an Accra calendar date', () => {
    assert.match(accraTodayIso(), /^\d{4}-\d{2}-\d{2}$/);
  });

  it('resolves the Accra weekday of a calendar date', () => {
    assert.equal(accraWeekday('2026-09-20'), 0); // Sunday
    assert.equal(accraWeekday('2026-09-16'), 3); // Wednesday
    assert.equal(accraWeekday('not-a-date'), null);
  });

  it('checks a scheduled date and time against opening hours', () => {
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-16', '10:00'), true);
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-16', '08:00'), true);
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-16', '15:30'), true);
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-16', '16:00'), false);
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-16', '07:59'), false);
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-19', '10:00'), false); // Saturday
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-20', '10:00'), false); // Sunday
    assert.equal(isClinicOpenAt('knust-hospital', '2026-09-20', '22:00'), true);
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-16', 'noon'), false);
  });

  it('publishes hours labels for error messages', () => {
    assert.equal(clinicHoursLabel('students-clinic'), 'Monday to Friday, 08:00–16:00');
    assert.equal(clinicHoursLabel('knust-hospital'), '24 hours, every day');
  });
});
