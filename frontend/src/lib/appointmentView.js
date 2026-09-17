import {
  clinicSiteLabel,
  formatDateLabel,
  formatTimeLabel,
  visitTypeLabel,
} from "../data/bookingOptions";

export const REFERENCE_PATTERN = /^YC-\d{4}$/;

export function normalizeReference(value) {
  const compact = String(value || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (/^YC\d{4}$/.test(compact)) {
    return `YC-${compact.slice(2)}`;
  }
  return compact;
}

export function entityId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value.id || value._id || "");
}

export function entityName(value, keys = ["name", "fullName"]) {
  if (!value) return "";
  if (typeof value === "string") return value;
  for (const key of keys) {
    if (value[key]) return String(value[key]);
  }
  return "";
}

export function patientPhone(appointment) {
  const patient = appointment?.patientId;
  return entityName(patient, ["phoneNumber", "phone"]);
}

export function mapAppointment(appointment) {
  const patient = appointment?.patientId;
  const clinician = appointment?.clinicianId;
  const room = appointment?.roomId;
  return {
    id: appointment?.id || appointment?._id || "",
    referenceCode: appointment?.referenceCode || "—",
    status: appointment?.status || "",
    fullName: entityName(patient, ["fullName"]) || "—",
    studentIndex: entityName(patient, ["studentIndex"]) || "—",
    phoneNumber: patientPhone(appointment) || "—",
    clinician: entityName(clinician, ["name"]) || "—",
    clinicianId: entityId(clinician),
    room: entityName(room, ["name"]) || entityName(clinician?.roomId, ["name"]) || "—",
    appointmentDate: appointment?.appointmentDate || "",
    appointmentTime: appointment?.appointmentTime || "",
    dateLabel: formatDateLabel(appointment?.appointmentDate),
    timeLabel: formatTimeLabel(appointment?.appointmentTime),
    clinic: clinicSiteLabel(appointment?.clinicSite),
    clinicSite: appointment?.clinicSite || "",
    visitType: visitTypeLabel(appointment?.visitType),
    queueToken: appointment?.queueToken || null,
    staffChangedTime: appointment?.staffChangedTime || "",
    staffChangeReason: appointment?.staffChangeReason || "",
    isHistorical: Boolean(appointment?.isHistorical),
    supersededBy: appointment?.supersededBy
      ? {
          referenceCode: appointment.supersededBy.referenceCode,
          status: appointment.supersededBy.status,
          appointmentDate: appointment.supersededBy.appointmentDate,
          appointmentTime: appointment.supersededBy.appointmentTime,
        }
      : null,
  };
}

export const QUEUE_STEPS = [
  { key: "BOOKED", label: "Booked" },
  { key: "CHECKED_IN", label: "Checked In" },
  { key: "WAITING", label: "In Queue" },
  { key: "CALLED", label: "Called" },
  { key: "COMPLETED", label: "Completed" },
];
