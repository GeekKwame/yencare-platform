import { CLINIC_SITES, VISIT_TYPES } from "./bookingOptions";
import { accraTodayIso } from "../lib/accraTime";

export const DEFAULT_CLINIC_SITE = "students-clinic";

export const CLINIC_SITE_LABELS = Object.fromEntries(
  CLINIC_SITES.map((site) => [site.id, site.name]),
);

export const VISIT_TYPE_LABELS = Object.fromEntries(
  VISIT_TYPES.map((visit) => [visit.id, visit.label]),
);

export function todayIsoDate() {
  return accraTodayIso();
}

export function formatAppointmentTime(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || "";
  const [hour, minute] = hhmm.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/**
 * Normalize API appointment documents into StaffPortal card shape.
 * @param {object} appt
 */
export function mapAppointmentToCard(appt) {
  const patient = appt.patientId && typeof appt.patientId === "object" ? appt.patientId : null;
  const clinicSite = appt.clinicSite || DEFAULT_CLINIC_SITE;

  return {
    id: appt.id || String(appt._id || ""),
    patientName: patient?.fullName || appt.patientName || "Unknown patient",
    reference: appt.referenceCode || appt.reference || "",
    service: VISIT_TYPE_LABELS[appt.visitType] || appt.service || appt.visitType || "Visit",
    appointmentTime: appt.appointmentTime || "",
    time: appt.appointmentTime
      ? formatAppointmentTime(appt.appointmentTime)
      : appt.time || "",
    status: appt.status || "BOOKED",
    clinicSite,
    clinic: CLINIC_SITE_LABELS[clinicSite] || clinicSite,
    date: appt.appointmentDate || appt.date || todayIsoDate(),
    studentIndex: patient?.studentIndex || appt.studentIndex || "",
    phone: patient?.phone || patient?.phoneNumber || appt.phone || "",
    bookingType: appt.bookingType || "BOOKED",
    queueToken: appt.queueToken || "",
    roomName: appt.roomId?.name || appt.assignedRoom || appt.roomName || "",
    roomId: appt.roomId?.id || appt.roomId?._id || (typeof appt.roomId === "string" ? appt.roomId : ""),
    clinicianName: appt.clinicianId?.name || appt.clinicianName || "",
    clinicianId: appt.clinicianId?.id || appt.clinicianId?._id || (typeof appt.clinicianId === "string" ? appt.clinicianId : ""),
    nhisNumber: patient?.nhisNumber || appt.nhisNumber || "",
    staffChangedTime: appt.staffChangedTime || "",
    staffChangeReason: appt.staffChangeReason || "",
    verificationStatus: appt.verificationStatus || "PENDING",
    verifiedAt: appt.verifiedAt || null,
    verifiedBy: appt.verifiedBy || null,
    verificationMethod: appt.verificationMethod || null,
    verificationFailureReason: appt.verificationFailureReason || null,
  };
}
