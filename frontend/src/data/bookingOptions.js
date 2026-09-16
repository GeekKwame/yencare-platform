/** Official KNUST health facilities used by the public booking wizard. */

export const CLINIC_SITES = [
  {
    id: "students-clinic",
    name: "KNUST Students' Clinic",
    location: "Opposite Hall 7, Africa Hall Road",
    description: "Public health department outpatient clinic for students.",
    openTime: "8:00 AM",
    closeTime: "4:00 PM",
    hoursLabel: "Mon–Fri: 8:00 AM – 4:00 PM",
  },
  {
    id: "knust-hospital",
    name: "KNUST Hospital",
    location: "North-eastern campus, Kumasi–Accra Highway (N6) · MCPG+GCX",
    description:
      "University Health Services district-level hospital serving students, staff, and the public.",
    openTime: "12:00 AM",
    closeTime: "11:59 PM",
    hoursLabel: "Open 24 hours",
  },
];

export const VISIT_TYPES = [
  { id: "general-opd", label: "General OPD" },
  { id: "follow-up", label: "Follow-up / Review" },
  { id: "dressing", label: "Dressing" },
  { id: "other", label: "Other Clinic Service" },
];

export const CLINICIANS = [
  {
    id: "dr-kwame-boateng",
    name: "Dr. Kwame Boateng",
    room: "Room 1",
    roomLabel: "General Clinic · Room 1",
    position: "Senior Medical Officer",
    clinicSite: "students-clinic",
  },
  {
    id: "dr-ama-serwaa",
    name: "Dr. Ama Serwaa",
    room: "Room 2",
    roomLabel: "General Clinic · Room 2",
    position: "Medical Officer",
    clinicSite: "students-clinic",
  },
  {
    id: "dr-kofi-adjei",
    name: "Dr. Kofi Adjei",
    room: "OPD Room 1",
    roomLabel: "Hospital OPD · Room 1",
    position: "Medical Officer",
    clinicSite: "knust-hospital",
  },
  {
    id: "dr-akua-mensah",
    name: "Dr. Akua Mensah",
    room: "OPD Room 2",
    roomLabel: "Hospital OPD · Room 2",
    position: "Medical Officer",
    clinicSite: "knust-hospital",
  },
];

/** Demo clinic days matching the prototype bookable window. */
export const AVAILABLE_DATES = [
  { iso: "2026-09-15", day: "Tuesday", label: "15 Sep 2026" },
  { iso: "2026-09-16", day: "Wednesday", label: "16 Sep 2026" },
  { iso: "2026-09-17", day: "Thursday", label: "17 Sep 2026" },
  { iso: "2026-09-18", day: "Friday", label: "18 Sep 2026" },
];

/** Include today so a booking can appear on Staff Portal's "today" roster. */
export function getAvailableDates() {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const day = now.toLocaleDateString("en-GB", { weekday: "long" });
  const label = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const dates = [...AVAILABLE_DATES];
  if (!dates.some((date) => date.iso === iso)) {
    dates.unshift({ iso, day, label });
  }
  return dates;
}

/** Prototype 30-minute consultation slots (display + 24h value). */
export const TIME_SLOTS = [
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "14:30", label: "2:30 PM" },
];

export function getClinicSite(id) {
  return CLINIC_SITES.find((site) => site.id === id) || null;
}

export function getVisitType(id) {
  return VISIT_TYPES.find((visit) => visit.id === id) || null;
}

export function getClinician(id) {
  return CLINICIANS.find((doctor) => doctor.id === id) || null;
}

export function getDateOption(iso) {
  return getAvailableDates().find((date) => date.iso === iso) || null;
}

export function getTimeSlot(value) {
  return TIME_SLOTS.find((slot) => slot.value === value) || null;
}

export function clinicSiteLabel(id) {
  return getClinicSite(id)?.name || id || "—";
}

export function visitTypeLabel(id) {
  return getVisitType(id)?.label || id || "—";
}

export function formatDateLabel(iso) {
  const found = getAvailableDates().find((date) => date.iso === iso);
  if (found) return `${found.day} ${found.label}`;
  return iso || "—";
}

export function formatTimeLabel(value) {
  return getTimeSlot(value)?.label || value || "—";
}

/** Arrive-by time = appointment time minus 15 minutes (prototype rule). */
export function formatClockLabel(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || "—";
  const known = getTimeSlot(hhmm);
  if (known) return known.label;
  const [hours, minutes] = hhmm.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = ((hours + 11) % 12) + 1;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function getArriveByLabel(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  const total = hours * 60 + minutes - 15;
  if (total < 0) return null;
  const arriveH = Math.floor(total / 60);
  const arriveM = total % 60;
  const value = `${String(arriveH).padStart(2, "0")}:${String(arriveM).padStart(2, "0")}`;
  return formatClockLabel(value);
}

export function isValidStudentIndex(value) {
  return /^\d{8}$/.test(String(value || "").trim());
}

/** Accept common Ghana mobile forms used by the prototype / backend. */
export function isValidGhanaPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^0[235]\d{8}$/.test(digits)) return true;
  if (/^[235]\d{8}$/.test(digits)) return true;
  if (/^233[235]\d{8}$/.test(digits)) return true;
  return false;
}

export function isValidFullName(value) {
  const name = String(value || "").trim();
  return name.length >= 2 && name.length <= 120;
}
