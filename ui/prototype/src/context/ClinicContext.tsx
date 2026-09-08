import React, { createContext, useContext, useState } from 'react';
import {
  Appointment,
  Doctor,
  StaffUser,
  PatientScreen,
  StaffScreen,
  ActiveShell,
  StaffRole,
  DraftBooking,
  RescheduleDraft,
  WalkInDraft,
  SmsMessage,
  ConnectivityState,
  ClinicSite,
  ClinicActivityOverride,
  RoomConsultationState,
  ClinicSiteActivity,
} from '../types/clinic';
import { getArriveBy, nextQueueToken, sortByQueueToken, waitingOnSite, isSlotOccupied as slotIsTaken, nextYcReference } from '../lib/clinicQueue';
import { announcePatientCall } from '../lib/clinicSpeech';
import { VISIT_TYPE_LABELS } from '../types/clinic';

// ─── Clinicians ──────────────────────────────────────────────────
export const DR_KWAME_BOATENG: Doctor = {
  id: 'dr-kwame-boateng',
  name: 'Dr. Kwame Boateng',
  title: 'Senior Medical Officer',
  specialty: 'General Clinic',
  room: 'Room 1',
  available: true,
};

export const DR_AMA_SERWAA: Doctor = {
  id: 'dr-ama-serwaa',
  name: 'Dr. Ama Serwaa',
  title: 'Medical Officer',
  specialty: 'General Clinic',
  room: 'Room 2',
  available: true,
};

export const ALL_DOCTORS: Doctor[] = [DR_KWAME_BOATENG, DR_AMA_SERWAA];

// Backwards-compat alias
export const CANONICAL_DOCTOR = DR_KWAME_BOATENG;

// ─── Initial Appointments ────────────────────────────────────────
export const INITIAL_APPOINTMENTS: Appointment[] = [
  // Sample booked students on the clinic day roster (not the signed-in session)
  {
    id: 'YC-4821',
    patientName: 'Akosua Boateng',
    phone: '024 XXX XXXX',
    studentIndex: '20612345',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:30 AM',
    status: 'BOOKED',
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    estimatedWaitMinutes: 30,
    notes: 'General consultation',
  },
  // Demo no-show candidate (staff roster / toolbar)
  {
    id: 'YC-4822',
    patientName: 'Yaw Boateng',
    phone: '024 555 0000',
    studentIndex: '20615500',
    doctor: DR_AMA_SERWAA,
    date: 'Tuesday 15 September 2026',
    time: '10:00 AM',
    status: 'BOOKED',
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    notes: 'Demo no-show candidate',
  },
  // Currently Being Served in Room 1 (#2)
  {
    id: 'YC-2001',
    patientName: 'Kweku Mensah',
    phone: '024 444 1122',
    studentIndex: '20619022',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:00 AM',
    status: 'CALLED',
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    queueToken: '#2',
    room: 'Room 1',
    assignedRoom: 'Room 1',
    estimatedWaitMinutes: 0,
    notes: 'In consultation Room 1',
  },
  // Active Consultation in Room 2 (#1)
  {
    id: 'YC-2002',
    patientName: 'Ama Agyei',
    phone: '020 777 8899',
    studentIndex: '20617711',
    doctor: DR_AMA_SERWAA,
    date: 'Tuesday 15 September 2026',
    time: '8:45 AM',
    status: 'CALLED',
    clinicSite: 'students-clinic',
    visitType: 'follow-up',
    bookingType: 'BOOKED',
    queueToken: '#1',
    room: 'Room 2',
    assignedRoom: 'Room 2',
    estimatedWaitMinutes: 0,
    notes: 'In consultation Room 2',
  },
  // 6 Waiting in Corridor for Students' Clinic (#3 through #8)
  {
    id: 'YC-3003',
    patientName: 'Kofi Addo',
    phone: '024 555 1234',
    studentIndex: '20618901',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:15 AM',
    status: 'WAITING',
    clinicSite: 'students-clinic',
    visitType: 'follow-up',
    bookingType: 'BOOKED',
    queueToken: '#3',
    estimatedWaitMinutes: 10,
    room: 'Room 1',
  },
  {
    id: 'YC-3004',
    patientName: 'Yaw Osei',
    phone: '020 987 6543',
    studentIndex: '20617654',
    doctor: DR_AMA_SERWAA,
    date: 'Tuesday 15 September 2026',
    time: '9:20 AM',
    status: 'WAITING',
    clinicSite: 'students-clinic',
    visitType: 'dressing',
    bookingType: 'BOOKED',
    queueToken: '#4',
    estimatedWaitMinutes: 15,
    room: 'Room 2',
  },
  {
    id: 'YC-3005',
    patientName: 'Abena Frimpong',
    phone: '027 444 8899',
    studentIndex: '20614455',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:25 AM',
    status: 'WAITING',
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    queueToken: '#5',
    estimatedWaitMinutes: 20,
    room: 'Room 1',
  },
  {
    id: 'YC-3006',
    patientName: 'Kojo Asante',
    phone: '050 222 3344',
    studentIndex: '20619933',
    doctor: DR_AMA_SERWAA,
    date: 'Tuesday 15 September 2026',
    time: '9:30 AM',
    status: 'WAITING',
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    queueToken: '#6',
    estimatedWaitMinutes: 25,
    room: 'Room 2',
  },
  {
    id: 'YC-3007',
    patientName: 'Esi Mansa',
    phone: '024 666 7788',
    studentIndex: '20613377',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:35 AM',
    status: 'WAITING',
    clinicSite: 'students-clinic',
    visitType: 'other',
    bookingType: 'BOOKED',
    queueToken: '#7',
    estimatedWaitMinutes: 30,
    room: 'Room 1',
  },
  {
    id: 'YC-3008',
    patientName: 'Kwabena Darko',
    phone: '026 888 9900',
    studentIndex: '20618800',
    doctor: DR_AMA_SERWAA,
    date: 'Tuesday 15 September 2026',
    time: '9:40 AM',
    status: 'WAITING',
    clinicSite: 'students-clinic',
    visitType: 'follow-up',
    bookingType: 'BOOKED',
    queueToken: '#8',
    estimatedWaitMinutes: 35,
    room: 'Room 2',
  },
  // Social Science Block GF7 Separate Location Queue
  {
    id: 'YC-9101',
    patientName: 'Efua Sutherland',
    phone: '050 333 2211',
    studentIndex: '20613322',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:15 AM',
    status: 'CALLED',
    clinicSite: 'social-science-gf7',
    visitType: 'other',
    bookingType: 'BOOKED',
    queueToken: '#1',
    assignedRoom: 'Room 1',
    room: 'Room 1',
    estimatedWaitMinutes: 0,
    notes: 'Social Science consult',
  },
  {
    id: 'YC-9102',
    patientName: 'Nana Yeboah',
    phone: '024 123 9988',
    studentIndex: '20619911',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:30 AM',
    status: 'WAITING',
    clinicSite: 'social-science-gf7',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    queueToken: '#2',
    estimatedWaitMinutes: 10,
    room: 'Room 1',
  },
  {
    id: 'YC-9103',
    patientName: 'Adwoa Sarfo',
    phone: '020 444 3322',
    studentIndex: '20614422',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:45 AM',
    status: 'WAITING',
    clinicSite: 'social-science-gf7',
    visitType: 'dressing',
    bookingType: 'BOOKED',
    queueToken: '#3',
    estimatedWaitMinutes: 15,
    room: 'Room 1',
  },
  {
    id: 'YC-9104',
    patientName: 'Kweku Baah',
    phone: '027 111 6655',
    studentIndex: '20611155',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '10:00 AM',
    status: 'WAITING',
    clinicSite: 'social-science-gf7',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    queueToken: '#4',
    estimatedWaitMinutes: 20,
    room: 'Room 1',
  },
  // Additional Roster Data
  {
    id: 'YC-5104',
    patientName: 'Kojo Antwi',
    phone: '024 777 6655',
    studentIndex: '20619988',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '8:30 AM',
    status: 'COMPLETED',
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    queueToken: '#0',
    room: 'Room 1',
    assignedRoom: 'Room 1',
  },
  {
    id: 'YC-8834',
    patientName: 'Nana Akufo',
    phone: '024 999 0011',
    studentIndex: '20612200',
    doctor: DR_KWAME_BOATENG,
    date: 'Tuesday 15 September 2026',
    time: '9:15 AM',
    status: 'CANCELLED',
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
  },
];

// ─── Initial SMS Log ─────────────────────────────────────────────
const INITIAL_SMS: SmsMessage[] = [
  {
    id: 'sms-001',
    appointmentId: 'YC-4821',
    type: 'confirmation',
    phone: '024 XXX XXXX',
    body: `KNUST Students' Clinic\n\nAppointment Confirmed\nTue 15 Sep, 9:30 AM\nRef: YC-4821\nArrive by 9:15 AM\n\nDr. Kwame Boateng · Room 1\nGeneral OPD`,
    timestamp: '2026-09-14 14:22',
  },
  {
    id: 'sms-002',
    appointmentId: 'YC-4821',
    type: 'reminder',
    phone: '024 XXX XXXX',
    body: `YɛnCare Reminder\n\nYour appointment is tomorrow.\nTue 15 Sep, 9:30 AM\nRef: YC-4821\n\nArrive by 9:15 AM at KNUST Students' Clinic.`,
    timestamp: '2026-09-14 18:00',
  },
];

// ─── Default Draft Booking ───────────────────────────────────────
const DEFAULT_DRAFT: DraftBooking = {
  patientName: '',
  phone: '',
  studentIndex: '',
  nhisNumber: '',
  clinicSite: 'students-clinic',
  visitType: 'general-opd',
  doctor: DR_KWAME_BOATENG,
  date: 'Tuesday 15 September 2026',
  time: '10:30 AM',
};

// ─── Context Type ────────────────────────────────────────────────
interface ClinicContextType {
  activeShell: ActiveShell;
  setActiveShell: (shell: ActiveShell) => void;
  patientScreen: PatientScreen;
  setPatientScreen: (screen: PatientScreen) => void;
  staffScreen: StaffScreen;
  setStaffScreen: (screen: StaffScreen) => void;
  selectedStaffAppointmentId: string | null;
  setSelectedStaffAppointmentId: (id: string | null) => void;

  // Data
  appointments: Appointment[];
  activePatientAppointmentId: string | null;
  setActivePatientAppointmentId: (id: string | null) => void;
  currentPatientAppointment: Appointment | undefined;
  staffUser: StaffUser;
  setStaffRole: (role: StaffRole) => void;
  allDoctors: Doctor[];

  // Draft Booking
  draftBooking: DraftBooking;
  updateDraftBooking: (partial: Partial<DraftBooking>) => void;
  confirmBooking: () => string;
  isSlotOccupied: (doctorId: string, date: string, time: string, excludeId?: string) => boolean;

  // Rescheduling
  rescheduleDraft: RescheduleDraft;
  updateRescheduleDraft: (partial: Partial<RescheduleDraft>) => void;
  confirmReschedule: () => void;

  // Clinic Operations
  arrivePatient: (id: string) => void;
  checkInPatient: (id: string) => void;
  callPatient: (id: string, room?: string) => void;
  completeVisit: (id: string) => void;
  cancelAppointment: (id: string) => void;
  markNoShow: (id: string) => void;
  addWalkIn: (draft: WalkInDraft) => string;
  changeAppointmentTime: (id: string, newTime: string, reason: string, newDate?: string) => void;

  // SMS
  smsLog: SmsMessage[];
  getSmsForAppointment: (appointmentId: string) => SmsMessage[];

  // Edge / Error States
  connectivityState: ConnectivityState;
  setConnectivityState: (state: ConnectivityState) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  isSessionExpired: boolean;
  setIsSessionExpired: (expired: boolean) => void;
  simulateSlotTaken: boolean;
  setSimulateSlotTaken: (slotTaken: boolean) => void;
  isAfterHours: boolean;
  setIsAfterHours: (afterHours: boolean) => void;

  // Notification Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Pre-Check-In Clinic Queue Visibility (Clinic Activity)
  clinicActivityOverride: ClinicActivityOverride;
  setClinicActivityOverride: (override: ClinicActivityOverride) => void;
  getClinicActivity: (site: ClinicSite) => ClinicSiteActivity;
  selfCheckIn: (id: string) => void;

  // Reset
  resetDemoData: () => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

// ─── Walk-in token counter ───────────────────────────────────────
let walkInCounter = 24;

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeShell, setActiveShell] = useState<ActiveShell>('PATIENT');
  const [patientScreen, setPatientScreen] = useState<PatientScreen>('P01_HOME');
  const [staffScreen, setStaffScreen] = useState<StaffScreen>('S02_TODAY');
  const [selectedStaffAppointmentId, setSelectedStaffAppointmentId] = useState<string | null>(null);
  const [activePatientAppointmentId, setActivePatientAppointmentId] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [smsLog, setSmsLog] = useState<SmsMessage[]>(INITIAL_SMS);

  const [staffUser, setStaffUser] = useState<StaffUser>({
    id: 'staff-01',
    name: 'Abena Osei',
    role: 'Receptionist',
    clinic: "KNUST Students' Clinic",
  });

  const [draftBooking, setDraftBooking] = useState<DraftBooking>({ ...DEFAULT_DRAFT });

  const [rescheduleDraft, setRescheduleDraft] = useState<RescheduleDraft>({
    newDate: 'Wednesday 16 September 2026',
    newTime: '11:00 AM',
  });

  const [connectivityState, setConnectivityState] = useState<ConnectivityState>('online');
  const [isOffline, setIsOfflineRaw] = useState<boolean>(false);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [simulateSlotTaken, setSimulateSlotTaken] = useState<boolean>(false);
  const [isAfterHours, setIsAfterHours] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync isOffline with connectivityState
  const setIsOffline = (offline: boolean) => {
    setIsOfflineRaw(offline);
    setConnectivityState(offline ? 'offline' : 'online');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const addSms = (msg: Omit<SmsMessage, 'id' | 'timestamp'>) => {
    const newSms: SmsMessage = {
      ...msg,
      id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    setSmsLog((prev) => [...prev, newSms]);
  };

  const currentPatientAppointment = appointments.find(
    (a) => a.id === activePatientAppointmentId
  );

  const getSmsForAppointment = (appointmentId: string) =>
    smsLog.filter((s) => s.appointmentId === appointmentId);

  const updateDraftBooking = (partial: Partial<DraftBooking>) => {
    setDraftBooking((prev) => ({ ...prev, ...partial }));
  };

  const updateRescheduleDraft = (partial: Partial<RescheduleDraft>) => {
    setRescheduleDraft((prev) => ({ ...prev, ...partial }));
  };

  // ─── Confirm Booking ────────────────────────────────────────
  const confirmBooking = (): string => {
    const doctor = draftBooking.doctor || DR_KWAME_BOATENG;
    const date = draftBooking.date || 'Tuesday 15 September 2026';
    const time = draftBooking.time || '9:30 AM';

    if (simulateSlotTaken || slotIsTaken(appointments, doctor.id, date, time)) {
      setPatientScreen('P08_SLOT_TAKEN');
      showToast('That slot was just taken. Please choose another time.');
      return '';
    }

    const newRef = nextYcReference(appointments);
    const visitLabel = VISIT_TYPE_LABELS[draftBooking.visitType || 'general-opd'];
    const newAppointment: Appointment = {
      id: newRef,
      patientName: draftBooking.patientName.trim(),
      phone: draftBooking.phone.trim(),
      studentIndex: draftBooking.studentIndex.trim(),
      nhisNumber: draftBooking.nhisNumber || undefined,
      doctor,
      date,
      time,
      status: 'BOOKED',
      clinicSite: draftBooking.clinicSite || 'students-clinic',
      visitType: draftBooking.visitType || 'general-opd',
      bookingType: 'BOOKED',
      notes: 'Booked via student web',
    };

    setAppointments((prev) => [newAppointment, ...prev]);

    addSms({
      appointmentId: newRef,
      type: 'confirmation',
      phone: newAppointment.phone,
      body: `KNUST ${newAppointment.clinicSite === 'social-science-gf7' ? 'Social Science Block GF7' : "Students' Clinic"}\n\nAppointment Confirmed\n${newAppointment.date.split(' ').slice(0, 3).join(' ')}, ${newAppointment.time}\nRef: ${newRef}\nArrive by ${getArriveBy(newAppointment.time)}\n\n${newAppointment.doctor.name} · ${newAppointment.doctor.room}\n${visitLabel}`,
    });

    setActivePatientAppointmentId(newRef);
    setSelectedStaffAppointmentId(newRef);
    setDraftBooking({ ...DEFAULT_DRAFT });
    setPatientScreen('P07_CONFIRMED');
    showToast(`Appointment confirmed: ${newRef}`);
    return newRef;
  };

  // ─── Confirm Reschedule ─────────────────────────────────────
  const confirmReschedule = () => {
    if (!activePatientAppointmentId) return;
    const oldApp = appointments.find((a) => a.id === activePatientAppointmentId);
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === activePatientAppointmentId) {
          return {
            ...app,
            date: rescheduleDraft.newDate,
            time: rescheduleDraft.newTime,
          };
        }
        return app;
      })
    );

    if (oldApp) {
      addSms({
        appointmentId: activePatientAppointmentId,
        type: 'time-changed',
        phone: oldApp.phone,
        body: `YɛnCare Update\n\nYour appointment has been rescheduled.\n\nNew: ${rescheduleDraft.newDate.split(' ').slice(0, 3).join(' ')}, ${rescheduleDraft.newTime}\nRef: ${activePatientAppointmentId}\n\nKNUST Students' Clinic`,
      });
    }

    setPatientScreen('P17_RESCHEDULE_CONFIRMED');
    showToast(`Appointment ${activePatientAppointmentId} rescheduled to ${rescheduleDraft.newDate}, ${rescheduleDraft.newTime}`);
  };

  // ─── Patient arrives at clinic (not yet in live queue) ──────
  const arrivePatient = (id: string) => {
    const target = appointments.find((a) => a.id === id);
    if (!target) {
      showToast('Appointment not found.');
      return;
    }
    if (target.status === 'CHECKED_IN') {
      setActivePatientAppointmentId(id);
      setPatientScreen('P18_QUEUE');
      showToast('You have already arrived. Reception will add you to the live queue.');
      return;
    }
    if (target.status !== 'BOOKED') {
      setActivePatientAppointmentId(id);
      setPatientScreen('P18_QUEUE');
      showToast(`${target.patientName} is already ${target.status.toLowerCase().replace('_', ' ')}.`);
      return;
    }

    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'CHECKED_IN' } : app))
    );
    setActivePatientAppointmentId(id);
    setSelectedStaffAppointmentId(id);
    setPatientScreen('P18_QUEUE');

    addSms({
      appointmentId: id,
      type: 'arrived',
      phone: target.phone,
      body: `YɛnCare\n\nWe've noted your arrival at ${target.clinicSite === 'social-science-gf7' ? 'Social Science Block GF7' : "Students' Clinic"}.\n\nPresent Ref ${id} at reception.\nReception will add you to the live queue.`,
    });

    showToast(`${target.patientName} has arrived. Reception can now check them into the live queue.`);
  };

  // Alias used by older patient screens
  const selfCheckIn = arrivePatient;

  // ─── Staff check-in: BOOKED or CHECKED_IN → live queue ──────
  const checkInPatient = (id: string) => {
    const target = appointments.find((a) => a.id === id);
    if (!target) {
      showToast('Appointment not found.');
      return;
    }
    if (target.status !== 'BOOKED' && target.status !== 'CHECKED_IN') {
      showToast(`${target.patientName} is already in the queue or not eligible for check-in.`);
      return;
    }

    const token = nextQueueToken(appointments, target.clinicSite);
    const waitingCount = appointments.filter(
      (a) => a.status === 'WAITING' && a.clinicSite === target.clinicSite
    ).length;
    const estimatedWaitMinutes = waitingCount * 8 + 15;

    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id !== id) return app;
        return {
          ...app,
          status: 'WAITING' as const,
          queueToken: token,
          estimatedWaitMinutes,
          room: app.doctor.room,
        };
      })
    );

    addSms({
      appointmentId: id,
      type: 'check-in',
      phone: target.phone,
      body: `YɛnCare\n\nYou are in the live queue.\nToken: ${token}\nEst. wait: ~${estimatedWaitMinutes} min\n\nWait nearby — we will text you when it is your turn.\nRef: ${id}`,
    });

    showToast(`${target.patientName} checked in to the live queue as ${token}.`);
  };

  // ─── Call Patient ───────────────────────────────────────────
  const callPatient = (id: string, room?: string) => {
    const target = appointments.find((a) => a.id === id);
    if (!target) {
      showToast('Appointment not found.');
      return;
    }
    if (target.status !== 'WAITING') {
      showToast('Only waiting students can be called into a room.');
      return;
    }

    const assignedRoom = room || target.doctor.room || 'Room 1';
    const site = target.clinicSite;

    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            status: 'CALLED' as const,
            assignedRoom,
            room: assignedRoom,
          };
        }
        return app;
      })
    );

    showToast(`Calling ${target.patientName} to ${assignedRoom}`);
    announcePatientCall(target.patientName, assignedRoom, target.queueToken);

    addSms({
      appointmentId: id,
      type: 'called',
      phone: target.phone,
      body: `YɛnCare\n\nIt is your turn.\nPlease proceed to ${assignedRoom}.\n\nRef: ${id}\n${target.doctor.name} is ready for you.`,
    });

    const nextUp = waitingOnSite(
      appointments.filter((a) => a.id !== id),
      site
    )[0];
    if (nextUp) {
      addSms({
        appointmentId: nextUp.id,
        type: 'next',
        phone: nextUp.phone,
        body: `YɛnCare\n\nYou're next in the queue.\nPlease return to the clinic.\n\nToken: ${nextUp.queueToken || '—'}\nRef: ${nextUp.id}`,
      });
    }
  };

  // ─── Complete Visit ─────────────────────────────────────────
  const completeVisit = (id: string) => {
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return { ...app, status: 'COMPLETED' };
        }
        return app;
      })
    );
    const target = appointments.find((a) => a.id === id);
    showToast(`Visit completed for ${target?.patientName || id}`);
  };

  // ─── Cancel Appointment ─────────────────────────────────────
  const cancelAppointment = (id: string) => {
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return { ...app, status: 'CANCELLED' };
        }
        return app;
      })
    );

    const target = appointments.find((a) => a.id === id);
    if (target) {
      addSms({
        appointmentId: id,
        type: 'cancelled',
        phone: target.phone,
        body: `YɛnCare\n\nYour appointment ${id} has been cancelled.\n\nIf you need medical attention, please book a new appointment.\n\nKNUST Students' Clinic`,
      });
    }

    showToast(`Appointment ${id} has been cancelled.`);
  };

  // ─── Mark No-Show ───────────────────────────────────────────
  const markNoShow = (id: string) => {
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return { ...app, status: 'NO_SHOW' };
        }
        return app;
      })
    );
    const target = appointments.find((a) => a.id === id);
    showToast(`${target?.patientName || id} marked as no-show.`);
  };

  // ─── Add Walk-In ────────────────────────────────────────────
  const addWalkIn = (draft: WalkInDraft): string => {
    walkInCounter++;
    const token = `W-${String(walkInCounter).padStart(3, '0')}`;
    const newAppointment: Appointment = {
      id: token,
      patientName: draft.patientName,
      phone: draft.phone,
      studentIndex: draft.studentIndex,
      doctor: DR_KWAME_BOATENG, // Default to first available
      date: 'Tuesday 15 September 2026',
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      status: 'WAITING',
      clinicSite: 'students-clinic',
      visitType: draft.visitType,
      bookingType: 'WALK_IN',
      queueToken: token,
      estimatedWaitMinutes: appointments.filter((a) => a.status === 'WAITING' && a.clinicSite === 'students-clinic').length * 8 + 15,
      notes: draft.notes,
    };

    setAppointments((prev) => [...prev, newAppointment]);

    addSms({
      appointmentId: token,
      type: 'walk-in-confirmation',
      phone: draft.phone,
      body: `KNUST Students' Clinic\n\nWalk-In Registered\nToken: ${token}\n\nYou have been added to the queue.\nEstimated wait: ~${newAppointment.estimatedWaitMinutes} min`,
    });

    showToast(`Walk-in ${draft.patientName} added to queue as ${token}`);
    return token;
  };

  // ─── Staff Change Appointment Time ──────────────────────────
  const changeAppointmentTime = (id: string, newTime: string, reason: string, newDate?: string) => {
    const target = appointments.find((a) => a.id === id);
    const nextDate = newDate || target?.date || 'Tuesday 15 September 2026';

    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            staffChangedTime: app.time,
            time: newTime,
            date: nextDate,
            staffChangeReason: reason,
          };
        }
        return app;
      })
    );

    if (target) {
      addSms({
        appointmentId: id,
        type: 'time-changed',
        phone: target.phone,
        body: `YɛnCare Update\n\nYour appointment has been updated by the clinic.\n\nNew Time: ${nextDate.split(' ').slice(0, 3).join(' ')}, ${newTime}\nRef: ${id}\nReason: ${reason}\n\nKNUST Students' Clinic`,
      });
    }

    showToast(`Appointment ${id} time changed to ${newTime}. SMS sent.`);
  };

  // ─── Staff Role ─────────────────────────────────────────────
  const setStaffRole = (role: StaffRole) => {
    setStaffUser((prev) => ({
      ...prev,
      role,
      name: role === 'Doctor' ? 'Dr. Kwame Boateng' : role === 'Admin' ? 'Kojo Mensah' : 'Abena Osei',
    }));
    showToast(`Role changed to ${role}`);
  };

  // ─── Reset Demo ─────────────────────────────────────────────
  const resetDemoData = () => {
    walkInCounter = 24;
    setAppointments(INITIAL_APPOINTMENTS);
    setSmsLog(INITIAL_SMS);
    setActivePatientAppointmentId(null);
    setPatientScreen('P01_HOME');
    setStaffScreen('S02_TODAY');
    setSelectedStaffAppointmentId(null);
    setIsOfflineRaw(false);
    setConnectivityState('online');
    setIsSessionExpired(false);
    setSimulateSlotTaken(false);
    setIsAfterHours(false);
    setClinicActivityOverride('normal');
    setDraftBooking({ ...DEFAULT_DRAFT });
    setRescheduleDraft({
      newDate: 'Wednesday 16 September 2026',
      newTime: '11:00 AM',
    });
    showToast('Reset clinic day. Book or find a student to start a session.');
  };

  const [clinicActivityOverride, setClinicActivityOverride] = useState<ClinicActivityOverride>('normal');

  const getClinicActivity = (site: ClinicSite): ClinicSiteActivity => {
    if (clinicActivityOverride === 'closed' || isAfterHours) {
      return {
        site,
        isOpen: false,
        waitingCount: 0,
        waitingTokens: [],
        activeRooms: [
          { room: 'Room 1', doctorName: 'Dr. Kwame Boateng', status: 'available', specialty: 'General OPD' },
          { room: 'Room 2', doctorName: 'Dr. Ama Serwaa', status: 'available', specialty: 'Reviews & OPD' },
        ],
        estimatedWaitMinutes: 0,
        demandLevel: 'low',
        lastUpdated: 'Just now',
      };
    }

    if (clinicActivityOverride === 'unavailable') {
      return {
        site,
        isOpen: true,
        waitingCount: 0,
        waitingTokens: [],
        activeRooms: [],
        estimatedWaitMinutes: 0,
        demandLevel: 'normal',
        lastUpdated: 'Unavailable',
      };
    }

    if (clinicActivityOverride === 'empty') {
      return {
        site,
        isOpen: true,
        nowServingToken: undefined,
        nowServingRoom: undefined,
        waitingCount: 0,
        waitingTokens: [],
        activeRooms: [
          { room: 'Room 1', doctorName: 'Dr. Kwame Boateng', status: 'available', specialty: 'General OPD' },
          { room: 'Room 2', doctorName: 'Dr. Ama Serwaa', status: 'available', specialty: 'Reviews & OPD' },
        ],
        estimatedWaitMinutes: 0,
        demandLevel: 'low',
        lastUpdated: 'Just now',
      };
    }

    const siteApps = appointments.filter((a) => a.clinicSite === site);
    const called = siteApps.filter((a) => a.status === 'CALLED');
    const waiting = siteApps.filter((a) => a.status === 'WAITING');

    const room1Called = called.find((c) => c.assignedRoom === 'Room 1' || c.doctor.room === 'Room 1');
    const room2Called = called.find((c) => c.assignedRoom === 'Room 2' || c.doctor.room === 'Room 2');
    const nowServing = room1Called || called[0];

    const waitingTokens = sortByQueueToken(waiting).map((w) => w.queueToken || '#--');
    const waitingCount = waiting.length;

    const activeRooms: RoomConsultationState[] = site === 'students-clinic' ? [
      {
        room: 'Room 1',
        doctorName: 'Dr. Kwame Boateng',
        status: room1Called ? 'in-consultation' : 'available',
        currentToken: room1Called?.queueToken,
        specialty: 'General OPD',
      },
      {
        room: 'Room 2',
        doctorName: 'Dr. Ama Serwaa',
        status: room2Called ? 'in-consultation' : 'available',
        currentToken: room2Called?.queueToken,
        specialty: 'Reviews & Consult',
      },
    ] : [
      {
        room: 'Room 1',
        doctorName: 'Dr. Kwame Boateng',
        status: room1Called ? 'in-consultation' : 'available',
        currentToken: room1Called?.queueToken,
        specialty: 'Outreach Consult',
      },
    ];

    let estimatedWaitMinutes = Math.max(15, waitingCount * 5 + 10);
    if (waitingCount >= 6) estimatedWaitMinutes = 35; // 30–40 min range
    let demandLevel: 'normal' | 'high' | 'low' = waitingCount >= 6 ? 'high' : waitingCount <= 2 ? 'low' : 'normal';

    if (clinicActivityOverride === 'high-demand') {
      demandLevel = 'high';
      estimatedWaitMinutes = 45;
    }

    return {
      site,
      isOpen: true,
      nowServingToken: nowServing?.queueToken || (site === 'students-clinic' ? '#2' : '#1'),
      nowServingRoom: nowServing?.assignedRoom || nowServing?.doctor.room || 'Room 1',
      waitingCount,
      waitingTokens: waitingTokens.length > 0 ? waitingTokens : (site === 'students-clinic' ? ['#3', '#4', '#5', '#6', '#7', '#8'] : ['#2', '#3', '#4']),
      activeRooms,
      estimatedWaitMinutes,
      demandLevel,
      lastUpdated: '2 min ago',
    };
  };

  return (
    <ClinicContext.Provider
      value={{
        activeShell,
        setActiveShell,
        patientScreen,
        setPatientScreen,
        staffScreen,
        setStaffScreen,
        selectedStaffAppointmentId,
        setSelectedStaffAppointmentId,
        appointments,
        activePatientAppointmentId,
        setActivePatientAppointmentId,
        currentPatientAppointment,
        staffUser,
        setStaffRole,
        allDoctors: ALL_DOCTORS,
        draftBooking,
        updateDraftBooking,
        confirmBooking,
        isSlotOccupied: (doctorId, date, time, excludeId) =>
          slotIsTaken(appointments, doctorId, date, time, excludeId),
        rescheduleDraft,
        updateRescheduleDraft,
        confirmReschedule,
        arrivePatient,
        checkInPatient,
        callPatient,
        completeVisit,
        cancelAppointment,
        markNoShow,
        addWalkIn,
        changeAppointmentTime,
        smsLog,
        getSmsForAppointment,
        connectivityState,
        setConnectivityState,
        isOffline,
        setIsOffline,
        isSessionExpired,
        setIsSessionExpired,
        simulateSlotTaken,
        setSimulateSlotTaken,
        isAfterHours,
        setIsAfterHours,
        toastMessage,
        showToast,
        clinicActivityOverride,
        setClinicActivityOverride,
        getClinicActivity,
        selfCheckIn,
        resetDemoData,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};

