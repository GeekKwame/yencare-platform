import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    assertNoShowAllowed,
    assertSlotNotInPast,
    assertVisitIsToday,
    assertWithinArrivalWindow,
} from '../src/services/visitDayGuard.js';
import { ValidationError } from '../src/patients/errors.js';

const NOW = new Date('2026-09-20T10:00:00Z');

describe('assertVisitIsToday', () => {
    it('allows an appointment dated today', () => {
        assert.doesNotThrow(() =>
            assertVisitIsToday({ appointmentDate: '2026-09-20' }, NOW),
        );
    });

    it('rejects an appointment on a future date', () => {
        assert.throws(
            () => assertVisitIsToday({ appointmentDate: '2026-10-08' }, NOW),
            (err) => {
                assert.ok(err instanceof ValidationError);
                assert.match(err.message, /2026-10-08/);
                assert.match(err.message, /day of the visit/);
                return true;
            },
        );
    });

    it('rejects an appointment on a past date with a different message', () => {
        assert.throws(
            () => assertVisitIsToday({ appointmentDate: '2026-09-19' }, NOW),
            (err) => {
                assert.ok(err instanceof ValidationError);
                assert.match(err.message, /2026-09-19/);
                assert.match(err.message, /has passed/);
                return true;
            },
        );
    });

    it('rejects tomorrow, even one second before midnight', () => {
        const lateTonight = new Date('2026-09-20T23:59:59Z');
        assert.throws(
            () => assertVisitIsToday({ appointmentDate: '2026-09-21' }, lateTonight),
            ValidationError,
        );
    });

    it('rolls over at midnight Accra time', () => {
        const lastSecond = new Date('2026-09-20T23:59:59Z');
        const firstSecond = new Date('2026-09-21T00:00:00Z');

        assert.doesNotThrow(() =>
            assertVisitIsToday({ appointmentDate: '2026-09-20' }, lastSecond),
        );
        assert.throws(
            () => assertVisitIsToday({ appointmentDate: '2026-09-20' }, firstSecond),
            ValidationError,
        );
        assert.doesNotThrow(() =>
            assertVisitIsToday({ appointmentDate: '2026-09-21' }, firstSecond),
        );
    });
});

describe('assertWithinArrivalWindow (slot at 10:00)', () => {
    const appt = { appointmentTime: '10:00' };

    it('rejects arriving more than 60 minutes early', () => {
        assert.throws(
            () => assertWithinArrivalWindow(appt, new Date('2026-09-20T08:59:00Z')),
            (err) => {
                assert.ok(err instanceof ValidationError);
                assert.match(err.message, /opens 60 minutes before/);
                return true;
            },
        );
    });

    it('allows arriving exactly 60 minutes early', () => {
        assert.doesNotThrow(() =>
            assertWithinArrivalWindow(appt, new Date('2026-09-20T09:00:00Z')),
        );
    });

    it('allows arriving on time', () => {
        assert.doesNotThrow(() =>
            assertWithinArrivalWindow(appt, new Date('2026-09-20T10:00:00Z')),
        );
    });

    it('allows arriving exactly 15 minutes late', () => {
        assert.doesNotThrow(() =>
            assertWithinArrivalWindow(appt, new Date('2026-09-20T10:15:00Z')),
        );
    });

    it('rejects arriving more than 15 minutes late and points to reception', () => {
        assert.throws(
            () => assertWithinArrivalWindow(appt, new Date('2026-09-20T10:16:00Z')),
            (err) => {
                assert.ok(err instanceof ValidationError);
                assert.match(err.message, /reception/);
                return true;
            },
        );
    });
});

describe('assertSlotNotInPast', () => {
    it('rejects a slot on a past date', () => {
        assert.throws(
            () => assertSlotNotInPast({ date: '2026-09-19', startTime: '14:00' }, NOW),
            ValidationError,
        );
    });

    it('rejects a slot earlier today that has already started', () => {
        assert.throws(
            () => assertSlotNotInPast({ date: '2026-09-20', startTime: '09:30' }, NOW),
            (err) => {
                assert.ok(err instanceof ValidationError);
                assert.match(err.message, /already started/);
                return true;
            },
        );
    });

    it('allows a later slot today', () => {
        assert.doesNotThrow(() =>
            assertSlotNotInPast({ date: '2026-09-20', startTime: '10:30' }, NOW),
        );
    });

    it('allows a slot that starts exactly now', () => {
        assert.doesNotThrow(() =>
            assertSlotNotInPast({ date: '2026-09-20', startTime: '10:00' }, NOW),
        );
    });

    it('allows a slot on a future date', () => {
        assert.doesNotThrow(() =>
            assertSlotNotInPast({ date: '2026-09-21', startTime: '08:30' }, NOW),
        );
    });
});

describe('assertNoShowAllowed (slot at 09:00, grace ends 09:15)', () => {
    const booked = {
        appointmentDate: '2026-09-20',
        appointmentTime: '09:00',
        status: 'BOOKED',
    };

    it('allows an appointment from a past day, even if still BOOKED', () => {
        assert.doesNotThrow(() =>
            assertNoShowAllowed({ ...booked, appointmentDate: '2026-09-19' }, NOW),
        );
    });

    it('refuses an appointment on a future date', () => {
        assert.throws(
            () => assertNoShowAllowed({ ...booked, appointmentDate: '2026-10-08' }, NOW),
            (err) => {
                assert.ok(err instanceof ValidationError);
                assert.match(err.message, /2026-10-08/);
                assert.match(err.message, /before the day of the visit/);
                return true;
            },
        );
    });

    it('refuses a BOOKED patient before the slot has even started', () => {
        assert.throws(
            () => assertNoShowAllowed(booked, new Date('2026-09-20T08:30:00Z')),
            (err) => {
                assert.ok(err instanceof ValidationError);
                assert.match(err.message, /until 09:15/);
                return true;
            },
        );
    });

    it('refuses a BOOKED patient when the slot has just started', () => {
        assert.throws(
            () => assertNoShowAllowed(booked, new Date('2026-09-20T09:00:00Z')),
            ValidationError,
        );
    });

    it('refuses a BOOKED patient at exactly the end of the grace period', () => {
        assert.throws(
            () => assertNoShowAllowed(booked, new Date('2026-09-20T09:15:00Z')),
            ValidationError,
        );
    });

    it('allows a BOOKED patient one minute after the grace period', () => {
        assert.doesNotThrow(() =>
            assertNoShowAllowed(booked, new Date('2026-09-20T09:16:00Z')),
        );
    });

    it('allows a BOOKED patient long after the grace period', () => {
        assert.doesNotThrow(() => assertNoShowAllowed(booked, NOW));
    });

    it('reports the grace end for a different slot time', () => {
        assert.throws(
            () => assertNoShowAllowed({ ...booked, appointmentTime: '11:00' }, NOW),
            (err) => {
                assert.ok(err instanceof ValidationError);
                assert.match(err.message, /until 11:15/);
                return true;
            },
        );
    });

    it('allows a patient who already arrived, even before the slot time', () => {
        const early = new Date('2026-09-20T08:30:00Z');
        for (const status of ['CHECKED_IN', 'WAITING', 'CALLED']) {
            assert.doesNotThrow(
                () => assertNoShowAllowed({ ...booked, status }, early),
                `status ${status} should be allowed`,
            );
        }
    });

    it('still refuses future dates for patients who are not BOOKED', () => {
        assert.throws(
            () =>
                assertNoShowAllowed(
                    { ...booked, appointmentDate: '2026-09-21', status: 'WAITING' },
                    NOW,
                ),
            ValidationError,
        );
    });
});