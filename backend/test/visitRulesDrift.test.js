import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertNoShowAllowed,
  assertVisitIsToday,
  assertWithinArrivalWindow,
  EARLY_WINDOW_MINUTES,
  LATE_GRACE_MINUTES,
} from '../src/services/visitDayGuard.js';
import * as frontendRules from '../../frontend/src/lib/visitRules.js';

const NOW = new Date('2026-09-30T12:00:00Z');
const TODAY = '2026-09-30';
const DATES = ['2026-09-29', TODAY, '2026-10-01'];

const hm = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

function serverAllows(check) {
  try {
    check();
    return true;
  } catch {
    return false;
  }
}

const SAMPLE_TIMES = [8 * 60, 11 * 60 + 45, 12 * 60, 13 * 60, 16 * 60 + 30];

function eachAppointment(run) {
  for (const appointmentDate of DATES) {
    if (appointmentDate === TODAY) {
      for (let start = 11 * 60; start <= 13 * 60 + 30; start += 1) {
        run({ appointmentDate, appointmentTime: hm(start) });
      }
    } else {
      for (const start of SAMPLE_TIMES) run({ appointmentDate, appointmentTime: hm(start) });
    }
  }
}

describe('frontend visit rules match the server guards', () => {
  it('frontend visit rules use the same arrival window and no-show grace as the server', () => {
    assert.equal(frontendRules.EARLY_WINDOW_MINUTES, EARLY_WINDOW_MINUTES);
    assert.equal(frontendRules.LATE_GRACE_MINUTES, LATE_GRACE_MINUTES);
    assert.equal(frontendRules.NO_SHOW_GRACE_MINUTES, LATE_GRACE_MINUTES);
  });

  it('patient "I\'ve arrived" is offered exactly when the server would accept it', () => {
    eachAppointment((appointment) => {
      const server = serverAllows(() => {
        assertVisitIsToday(appointment, NOW);
        assertWithinArrivalWindow(appointment, NOW);
      });
      const screen = frontendRules.arrivalState(appointment, NOW);
      assert.equal(screen.canArrive, server, `${appointment.appointmentDate} ${appointment.appointmentTime}`);
      assert.equal(Boolean(screen.reason), !server);
    });
  });

  it('staff check-in and queueing are enabled exactly when the server would accept them', () => {
    eachAppointment((appointment) => {
      const server = serverAllows(() => assertVisitIsToday(appointment, NOW));
      for (const status of ['BOOKED', 'CHECKED_IN']) {
        const screen = frontendRules.staffActionState({ ...appointment, status }, NOW);
        assert.equal(screen.canCheckIn, server);
        assert.equal(screen.canQueue, server);
        assert.equal(Boolean(screen.checkInNote), !server);
      }
    });
  });

  it('staff no-show is enabled exactly when the server would accept it, including at the grace boundary', () => {
    eachAppointment((appointment) => {
      for (const status of ['BOOKED', 'CHECKED_IN', 'WAITING']) {
        const server = serverAllows(() => assertNoShowAllowed({ ...appointment, status }, NOW));
        const screen = frontendRules.staffActionState({ ...appointment, status }, NOW);
        assert.equal(
          screen.canNoShow,
          server,
          `${status} ${appointment.appointmentDate} ${appointment.appointmentTime}`,
        );
        assert.equal(Boolean(screen.noShowNote), !server);
      }
    });
  });

  it('roster cards (date + HH:mm) are judged the same as API appointments', () => {
    const card = { date: TODAY, appointmentTime: hm(12 * 60 - LATE_GRACE_MINUTES), status: 'BOOKED' };
    const server = serverAllows(() =>
      assertNoShowAllowed({ appointmentDate: card.date, appointmentTime: card.appointmentTime, status: 'BOOKED' }, NOW),
    );
    assert.equal(server, false);
    assert.equal(frontendRules.staffActionState(card, NOW).canNoShow, false);
  });
});
