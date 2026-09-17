import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isClinicOpen, accraTodayIso } from '../src/lib/accraTime.js';

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
});
