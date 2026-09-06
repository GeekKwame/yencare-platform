// ─── Status & Enumerations ───────────────────────────────────────
export type AppointmentStatus = 'BOOKED' | 'CHECKED_IN' | 'WAITING' | 'CALLED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type StaffRole = 'Receptionist' | 'Doctor' | 'Admin';

export type ClinicSite = 'students-clinic' | 'social-science-gf7';

export type VisitType = 'general-opd' | 'follow-up' | 'dressing' | 'other';

export type BookingType = 'BOOKED' | 'WALK_IN';

export type ConnectivityState = 'online' | 'poor' | 'offline' | 'restored';

// ─── Clinician / Doctor ──────────────────────────────────────────
export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  room: string;
  available: boolean;
}

// ─── SMS Simulation ──────────────────────────────────────────────
export type SmsType =
  | 'confirmation'
  | 'reminder'
  | 'time-changed'
  | 'cancelled'
  | 'called'
  | 'next'
  | 'walk-in-confirmation';

export interface SmsMessage {
  id: string;
  appointmentId: string;
  type: SmsType;
  phone: string;
  body: string;
  timestamp: string;
}

// ─── Appointment ─────────────────────────────────────────────────
export interface Appointment {
  id: string;                    // e.g. "YC-4821" or "W-024"
  patientName: string;
  phone: string;                 // e.g. "024 XXX XXXX"
  studentIndex?: string;         // e.g. "20612345"
  nhisNumber?: string;           // optional NHIS
  doctor: Doctor;
  date: string;                  // e.g. "Tuesday 15 September 2026"
  time: string;                  // e.g. "9:30 AM"
  status: AppointmentStatus;
  clinicSite: ClinicSite;
  visitType: VisitType;
  bookingType: BookingType;
  queueToken?: string;           // e.g. "#4" or "W-024"
  estimatedWaitMinutes?: number;
  room?: string;                 // e.g. "Room 1"
  assignedRoom?: string;         // set when called
  createdAt?: string;
  notes?: string;
  staffChangeReason?: string;    // reason for staff-initiated time change
  staffChangedTime?: string;     // previous time before staff change
}

// ─── Staff ───────────────────────────────────────────────────────
export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
  clinic: string;
}

// ─── Draft Booking ───────────────────────────────────────────────
export interface DraftBooking {
  patientName: string;
  phone: string;
  studentIndex: string;
  nhisNumber: string;
  clinicSite: ClinicSite;
  visitType: VisitType;
  doctor: Doctor;
  date: string;
  time: string;
}

// ─── Reschedule Draft ────────────────────────────────────────────
export interface RescheduleDraft {
  newDate: string;
  newTime: string;
}

// ─── Walk-In Draft ───────────────────────────────────────────────
export interface WalkInDraft {
  patientName: string;
  studentIndex: string;
  phone: string;
  visitType: VisitType;
}

// ─── Screen Navigation ──────────────────────────────────────────
export type PatientScreen =
  | 'P01_HOME'
  | 'P02_DETAILS'
  | 'P02B_CLINIC_SITE'
  | 'P02C_VISIT_TYPE'
  | 'P03_DOCTOR'
  | 'P04_05_DATE_TIME'
  | 'P06_REVIEW'
  | 'P07_CONFIRMED'
  | 'P08_SLOT_TAKEN'
  | 'P09_FIND'
  | 'P10_CLINIC_ACTIVITY'
  | 'P11_DETAILS'
  | 'P12_CANCEL_CONFIRM'
  | 'P13_CANCELLED'
  | 'P14_RESCHEDULE_DATE'
  | 'P15_RESCHEDULE_TIME'
  | 'P16_RESCHEDULE_REVIEW'
  | 'P17_RESCHEDULE_CONFIRMED'
  | 'P18_QUEUE'
  | 'P19_AFTER_HOURS';

// ─── Clinic Activity Pre-Check-In Types ─────────────────────────
export type ClinicActivityOverride = 'normal' | 'empty' | 'high-demand' | 'unavailable' | 'closed';

export interface RoomConsultationState {
  room: string;
  doctorName: string;
  status: 'in-consultation' | 'available';
  currentToken?: string;
  specialty?: string;
}

export interface ClinicSiteActivity {
  site: ClinicSite;
  isOpen: boolean;
  nowServingToken?: string;
  nowServingRoom?: string;
  waitingCount: number;
  waitingTokens: string[];
  activeRooms: RoomConsultationState[];
  estimatedWaitMinutes: number;
  demandLevel: 'normal' | 'high' | 'low';
  lastUpdated: string;
}

export type StaffScreen =
  | 'S01_SIGN_IN'
  | 'S02_TODAY'
  | 'S03_APPOINTMENTS'
  | 'S04_APPOINTMENT_DETAIL'
  | 'S05_LIVE_QUEUE'
  | 'S05_EMPTY_QUEUE'
  | 'S06_WALK_IN'
  | 'S07_SESSION_EXPIRED'
  | 'S08_CHANGE_APPOINTMENT'
  | 'S09_NO_SHOW_CONFIRM';

export type ActiveShell = 'PATIENT' | 'STAFF';

// ─── Clinic Site Labels ──────────────────────────────────────────
export const CLINIC_SITE_LABELS: Record<ClinicSite, { name: string; org: string; address: string }> = {
  'students-clinic': {
    name: "Students' Clinic",
    org: 'KNUST University Health Services',
    address: 'Main Campus, KNUST, Kumasi',
  },
  'social-science-gf7': {
    name: 'Social Science Block GF7',
    org: 'KNUST University Health Services',
    address: 'Social Science Building, Ground Floor, KNUST',
  },
};

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  'general-opd': 'General OPD',
  'follow-up': 'Follow-up / Review',
  'dressing': 'Dressing',
  'other': 'Other Clinic Service',
};
