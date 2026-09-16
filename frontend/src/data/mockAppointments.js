import { CLINIC_SITES, VISIT_TYPES } from "./bookingOptions";

export const DEFAULT_CLINIC_SITE = "students-clinic";

export const CLINIC_SITE_LABELS = Object.fromEntries(
  CLINIC_SITES.map((site) => [site.id, site.name]),
);

export const VISIT_TYPE_LABELS = Object.fromEntries(
  VISIT_TYPES.map((visit) => [visit.id, visit.label]),
);

/** Seed roster used when the API is unreachable. */
export const mockAppointments = [
  {
    id: "mock-1",
    patientName: "Akosua Boateng",
    reference: "YC-4821",
    service: "General OPD",
    time: "10:00 AM",
    status: "BOOKED",
    clinicSite: "students-clinic",
    date: "2026-09-10",
    studentIndex: "20612345",
    phone: "024 111 2233",
    bookingType: "SCHEDULED",
  },
  {
    id: "mock-2",
    patientName: "Kwame Asante",
    reference: "YC-4822",
    service: "Follow-up / Review",
    time: "10:30 AM",
    status: "BOOKED",
    clinicSite: "students-clinic",
    date: "2026-09-10",
    studentIndex: "20613456",
    phone: "055 222 3344",
    bookingType: "SCHEDULED",
  },
  {
    id: "mock-3",
    patientName: "Kojo Mensah",
    reference: "YC-4824",
    service: "General OPD",
    time: "11:00 AM",
    status: "WAITING",
    clinicSite: "students-clinic",
    date: "2026-09-10",
    studentIndex: "20614567",
    phone: "027 333 4455",
    bookingType: "SCHEDULED",
    queueToken: "#3",
    roomName: "Room 1",
  },
  {
    id: "mock-4",
    patientName: "Ama Serwaa",
    reference: "YC-4823",
    service: "Dressing",
    time: "11:30 AM",
    status: "CHECKED_IN",
    clinicSite: "students-clinic",
    date: "2026-09-10",
    studentIndex: "20615678",
    phone: "020 444 5566",
    bookingType: "SCHEDULED",
  },
  {
    id: "mock-5",
    patientName: "Kofi Owusu",
    reference: "YC-4826",
    service: "General OPD",
    time: "09:30 AM",
    status: "CHECKED_IN",
    clinicSite: "students-clinic",
    date: "2026-09-10",
    studentIndex: "20616789",
    phone: "024 555 6677",
    bookingType: "SCHEDULED",
  },
  {
    id: "mock-6",
    patientName: "Yaw Boateng",
    reference: "YC-4827",
    service: "General OPD",
    time: "09:00 AM",
    status: "CALLED",
    clinicSite: "students-clinic",
    date: "2026-09-10",
    studentIndex: "20617890",
    phone: "055 666 7788",
    bookingType: "SCHEDULED",
    queueToken: "#1",
  },
  {
    id: "mock-7",
    patientName: "Adwoa Mensah",
    reference: "YC-4828",
    service: "Follow-up / Review",
    time: "08:30 AM",
    status: "COMPLETED",
    clinicSite: "students-clinic",
    date: "2026-09-10",
    studentIndex: "20618901",
    phone: "027 777 8899",
    bookingType: "SCHEDULED",
    queueToken: "#0",
  },
  {
    id: "mock-8",
    patientName: "Efua Darko",
    reference: "YC-4825",
    service: "General OPD",
    time: "09:00 AM",
    status: "BOOKED",
    clinicSite: "knust-hospital",
    date: "2026-09-10",
    studentIndex: "20619012",
    phone: "024 888 9900",
    bookingType: "SCHEDULED",
  },
  {
    id: "mock-9",
    patientName: "Nana Agyeman",
    reference: "YC-4829",
    service: "General OPD",
    time: "10:15 AM",
    status: "NO_SHOW",
    clinicSite: "knust-hospital",
    date: "2026-09-10",
    studentIndex: "20620123",
    phone: "055 999 0011",
    bookingType: "SCHEDULED",
  },
];

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function formatAppointmentTime(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || "";
  const [hour, minute] = hhmm.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/**
 * Offline fallback roster for the selected clinic site (presented as the requested date).
 * @param {string} [clinicSite]
 * @param {string} [date]
 */
export function getMockTodaysAppointments(
  clinicSite = DEFAULT_CLINIC_SITE,
  date = todayIsoDate(),
) {
  return mockAppointments
    .filter((appt) => appt.clinicSite === clinicSite)
    .map((appt) => ({
      ...appt,
      date,
      clinic: CLINIC_SITE_LABELS[clinicSite] || clinicSite,
    }));
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
    time: appt.appointmentTime
      ? formatAppointmentTime(appt.appointmentTime)
      : appt.time || "",
    status: appt.status || "BOOKED",
    clinicSite,
    clinic: CLINIC_SITE_LABELS[clinicSite] || clinicSite,
    date: appt.appointmentDate || appt.date || todayIsoDate(),
    studentIndex: patient?.studentIndex || appt.studentIndex || "",
    phone: patient?.phone || patient?.phoneNumber || appt.phone || "",
    bookingType: appt.bookingType || "SCHEDULED",
    queueToken: appt.queueToken || "",
    roomName: appt.roomId?.name || appt.assignedRoom || appt.roomName || "",
    roomId: appt.roomId?.id || appt.roomId?._id || (typeof appt.roomId === "string" ? appt.roomId : ""),
    clinicianName: appt.clinicianId?.name || appt.clinicianName || "",
    nhisNumber: patient?.nhisNumber || appt.nhisNumber || "",
  };
}
