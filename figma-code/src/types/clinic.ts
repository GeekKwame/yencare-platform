export type AppointmentStatus = 'BOOKED' | 'WAITING' | 'CALLED' | 'COMPLETED' | 'CANCELLED';

export type StaffRole = 'Receptionist' | 'Doctor' | 'Admin';

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  room: string;
  available: boolean;
}

export interface Appointment {
  id: string; // e.g. "YC-4821"
  patientName: string;
  phone: string; // e.g. "024 123 4567"
  doctor: Doctor;
  date: string; // e.g. "Tuesday 15 September 2026"
  time: string; // e.g. "10:00 AM"
  status: AppointmentStatus;
  queueToken?: string; // e.g. "#4"
  estimatedWaitMinutes?: number; // e.g. 40
  room?: string; // e.g. "Consultation Room 3"
  createdAt?: string;
  notes?: string;
}

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
  clinic: string;
}

export type PatientScreen = 
  | 'P01_HOME'
  | 'P02_DETAILS'
  | 'P03_DOCTOR'
  | 'P04_05_DATE_TIME'
  | 'P06_REVIEW'
  | 'P07_CONFIRMED'
  | 'P08_SLOT_TAKEN'
  | 'P09_FIND'
  | 'P11_DETAILS'
  | 'P12_CANCEL_CONFIRM'
  | 'P13_CANCELLED'
  | 'P14_RESCHEDULE_DATE'
  | 'P15_RESCHEDULE_TIME'
  | 'P16_RESCHEDULE_REVIEW'
  | 'P17_RESCHEDULE_CONFIRMED'
  | 'P18_QUEUE';

export type StaffScreen = 
  | 'S01_SIGN_IN'
  | 'S02_TODAY'
  | 'S03_APPOINTMENTS'
  | 'S04_APPOINTMENT_DETAIL'
  | 'S05_LIVE_QUEUE'
  | 'S05_EMPTY_QUEUE'
  | 'S07_SESSION_EXPIRED';

export type ActiveShell = 'PATIENT' | 'STAFF';
