import {
  EARLY_WINDOW_MINUTES,
  LATE_GRACE_MINUTES,
  accraMinutesNow,
  accraTodayIso,
  clockMinutes,
  formatClock,
  formatVisitDate,
  getArrivalWindowStatus,
} from "./accraTime.js";

export { EARLY_WINDOW_MINUTES, LATE_GRACE_MINUTES, getArrivalWindowStatus };

export const NO_SHOW_GRACE_MINUTES = LATE_GRACE_MINUTES;

export function arrivalState(appointment, now = new Date()) {
  return getArrivalWindowStatus(
    appointment?.appointmentDate || appointment?.date || "",
    appointment?.appointmentTime || "",
    now,
  );
}

function visitDayNote(date, today) {
  if (!date) return "The visit date is missing.";
  if (date > today) return `Check-in opens on ${formatVisitDate(date)}.`;
  if (date < today) return `This visit was on ${formatVisitDate(date)} and has passed.`;
  return "";
}

function noShowState(date, start, status, today, now) {
  if (!date) return { canNoShow: false, noShowNote: "The visit date is missing." };
  if (date < today) return { canNoShow: true, noShowNote: "" };
  if (date > today) {
    return {
      canNoShow: false,
      noShowNote:
        start === null
          ? `No-show is available on ${formatVisitDate(date)}.`
          : `No-show is available from ${formatClock(start + NO_SHOW_GRACE_MINUTES)} on ${formatVisitDate(date)}.`,
    };
  }
  if (status !== "BOOKED") return { canNoShow: true, noShowNote: "" };
  if (start === null) return { canNoShow: false, noShowNote: "The appointment time is missing." };
  const graceEnds = start + NO_SHOW_GRACE_MINUTES;
  if (accraMinutesNow(now) > graceEnds) return { canNoShow: true, noShowNote: "" };
  return {
    canNoShow: false,
    noShowNote: `The patient can still arrive until ${formatClock(graceEnds)}. No-show is available after that.`,
  };
}

export function staffActionState(appointment, now = new Date()) {
  const date = appointment?.appointmentDate || appointment?.date || "";
  const start = clockMinutes(appointment?.appointmentTime);
  const status = appointment?.status || "";
  const today = accraTodayIso(now);
  const dayNote = visitDayNote(date, today);
  const onVisitDay = !dayNote;

  return {
    canCheckIn: onVisitDay,
    checkInNote: dayNote,
    canQueue: onVisitDay,
    queueNote: dayNote,
    ...noShowState(date, start, status, today, now),
    canChangeTime: status === "BOOKED",
  };
}
