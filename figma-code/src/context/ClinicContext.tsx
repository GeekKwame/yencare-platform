import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Appointment, 
  Doctor, 
  StaffUser, 
  PatientScreen, 
  StaffScreen, 
  ActiveShell, 
  StaffRole 
} from '../types/clinic';

export const CANONICAL_DOCTOR: Doctor = {
  id: 'dr-kwame-boateng',
  name: 'Dr. Kwame Boateng',
  title: 'Senior Medical Officer',
  specialty: 'General Clinic',
  room: 'Consultation Room 3',
  available: true,
};

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'YC-4821',
    patientName: 'Ama Mensah',
    phone: '024 123 4567',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '10:00 AM',
    status: 'BOOKED',
    queueToken: '#4',
    estimatedWaitMinutes: 40,
    room: 'Consultation Room 3',
    notes: 'General consultation and routine checkup',
  },
  {
    id: 'YC-1092',
    patientName: 'Kofi Addo',
    phone: '024 555 1234',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '09:30 AM',
    status: 'WAITING',
    queueToken: '#5',
    estimatedWaitMinutes: 15,
    room: 'Consultation Room 3',
    notes: 'Follow-up on laboratory results',
  },
  {
    id: 'YC-3381',
    patientName: 'Akua Serwaa',
    phone: '020 987 6543',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '09:45 AM',
    status: 'WAITING',
    queueToken: '#6',
    estimatedWaitMinutes: 30,
    room: 'Consultation Room 3',
    notes: 'Blood pressure monitoring',
  },
  {
    id: 'YC-7712',
    patientName: 'Kwame Nkrumah',
    phone: '027 444 8899',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '10:15 AM',
    status: 'BOOKED',
    queueToken: '#7',
    notes: 'Prescription refill review',
  },
  {
    id: 'YC-9021',
    patientName: 'Efua Sutherland',
    phone: '050 333 2211',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '10:30 AM',
    status: 'BOOKED',
    notes: 'Initial clinical assessment',
  },
  {
    id: 'YC-5104',
    patientName: 'Kojo Antwi',
    phone: '024 777 6655',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '09:00 AM',
    status: 'COMPLETED',
    queueToken: '#3',
    room: 'Consultation Room 3',
  },
  {
    id: 'YC-6299',
    patientName: 'Yaa Asantewaa',
    phone: '020 111 4433',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '08:30 AM',
    status: 'COMPLETED',
    queueToken: '#2',
    room: 'Consultation Room 3',
  },
  {
    id: 'YC-8834',
    patientName: 'Nana Akufo',
    phone: '024 999 0011',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '09:15 AM',
    status: 'CANCELLED',
  },
];

interface DraftBooking {
  patientName: string;
  phone: string;
  doctor: Doctor;
  date: string;
  time: string;
}

interface RescheduleDraft {
  newDate: string;
  newTime: string;
}

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
  activePatientAppointmentId: string;
  setActivePatientAppointmentId: (id: string) => void;
  currentPatientAppointment: Appointment | undefined;
  staffUser: StaffUser;
  setStaffRole: (role: StaffRole) => void;
  
  // Draft Booking
  draftBooking: DraftBooking;
  updateDraftBooking: (partial: Partial<DraftBooking>) => void;
  confirmBooking: () => string;
  
  // Rescheduling
  rescheduleDraft: RescheduleDraft;
  updateRescheduleDraft: (partial: Partial<RescheduleDraft>) => void;
  confirmReschedule: () => void;
  
  // Clinic Operations
  checkInPatient: (id: string) => void;
  callPatient: (id: string) => void;
  completeVisit: (id: string) => void;
  cancelAppointment: (id: string) => void;
  
  // Edge / Error States
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  isSessionExpired: boolean;
  setIsSessionExpired: (expired: boolean) => void;
  simulateSlotTaken: boolean;
  setSimulateSlotTaken: (slotTaken: boolean) => void;
  
  // Notification Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
  
  // Reset
  resetDemoData: () => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeShell, setActiveShell] = useState<ActiveShell>('PATIENT');
  const [patientScreen, setPatientScreen] = useState<PatientScreen>('P01_HOME');
  const [staffScreen, setStaffScreen] = useState<StaffScreen>('S02_TODAY');
  const [selectedStaffAppointmentId, setSelectedStaffAppointmentId] = useState<string | null>('YC-4821');
  const [activePatientAppointmentId, setActivePatientAppointmentId] = useState<string>('YC-4821');

  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [staffUser, setStaffUser] = useState<StaffUser>({
    id: 'staff-01',
    name: 'Abena Osei',
    role: 'Receptionist',
    clinic: '[Partner clinic]',
  });

  const [draftBooking, setDraftBooking] = useState<DraftBooking>({
    patientName: 'Ama Mensah',
    phone: '024 123 4567',
    doctor: CANONICAL_DOCTOR,
    date: 'Tuesday 15 September 2026',
    time: '10:00 AM',
  });

  const [rescheduleDraft, setRescheduleDraft] = useState<RescheduleDraft>({
    newDate: 'Wednesday 16 September 2026',
    newTime: '11:00 AM',
  });

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [simulateSlotTaken, setSimulateSlotTaken] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const currentPatientAppointment = appointments.find(
    (a) => a.id === activePatientAppointmentId
  );

  const updateDraftBooking = (partial: Partial<DraftBooking>) => {
    setDraftBooking((prev) => ({ ...prev, ...partial }));
  };

  const updateRescheduleDraft = (partial: Partial<RescheduleDraft>) => {
    setRescheduleDraft((prev) => ({ ...prev, ...partial }));
  };

  const confirmBooking = (): string => {
    const newRef = 'YC-4821';
    const newAppointment: Appointment = {
      id: newRef,
      patientName: draftBooking.patientName || 'Ama Mensah',
      phone: draftBooking.phone || '024 123 4567',
      doctor: draftBooking.doctor || CANONICAL_DOCTOR,
      date: draftBooking.date || 'Tuesday 15 September 2026',
      time: draftBooking.time || '10:00 AM',
      status: 'BOOKED',
      queueToken: '#4',
      estimatedWaitMinutes: 40,
      room: 'Consultation Room 3',
      notes: 'New appointment created via Patient Web Portal',
    };

    setAppointments((prev) => {
      const filtered = prev.filter((a) => a.id !== newRef);
      return [newAppointment, ...filtered];
    });

    setActivePatientAppointmentId(newRef);
    setPatientScreen('P07_CONFIRMED');
    showToast(`Appointment confirmed: ${newRef}`);
    return newRef;
  };

  const confirmReschedule = () => {
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
    setPatientScreen('P17_RESCHEDULE_CONFIRMED');
    showToast(`Appointment ${activePatientAppointmentId} rescheduled to ${rescheduleDraft.newDate}, ${rescheduleDraft.newTime}`);
  };

  const checkInPatient = (id: string) => {
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            status: 'WAITING',
            queueToken: app.queueToken || '#4',
            estimatedWaitMinutes: app.estimatedWaitMinutes || 40,
            room: 'Consultation Room 3',
          };
        }
        return app;
      })
    );
    const target = appointments.find((a) => a.id === id);
    showToast(`${target?.patientName || id} is checked in and waiting in queue.`);
  };

  const callPatient = (id: string) => {
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            status: 'CALLED',
            room: 'Consultation Room 3',
          };
        }
        return app;
      })
    );
    const target = appointments.find((a) => a.id === id);
    showToast(`Calling ${target?.patientName || id} to Consultation Room 3`);
  };

  const completeVisit = (id: string) => {
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            status: 'COMPLETED',
          };
        }
        return app;
      })
    );
    const target = appointments.find((a) => a.id === id);
    showToast(`Visit completed for ${target?.patientName || id}`);
  };

  const cancelAppointment = (id: string) => {
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            status: 'CANCELLED',
          };
        }
        return app;
      })
    );
    showToast(`Appointment ${id} has been cancelled.`);
  };

  const setStaffRole = (role: StaffRole) => {
    setStaffUser((prev) => ({
      ...prev,
      role,
      name: role === 'Doctor' ? 'Dr. Kwame Boateng' : role === 'Admin' ? 'Kojo Mensah' : 'Abena Osei',
    }));
    showToast(`Role changed to ${role}`);
  };

  const resetDemoData = () => {
    setAppointments(INITIAL_APPOINTMENTS);
    setActivePatientAppointmentId('YC-4821');
    setPatientScreen('P01_HOME');
    setStaffScreen('S02_TODAY');
    setSelectedStaffAppointmentId('YC-4821');
    setIsOffline(false);
    setIsSessionExpired(false);
    setSimulateSlotTaken(false);
    setDraftBooking({
      patientName: 'Ama Mensah',
      phone: '024 123 4567',
      doctor: CANONICAL_DOCTOR,
      date: 'Tuesday 15 September 2026',
      time: '10:00 AM',
    });
    setRescheduleDraft({
      newDate: 'Wednesday 16 September 2026',
      newTime: '11:00 AM',
    });
    showToast('Reset to canonical YC-4821 demo state');
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
        draftBooking,
        updateDraftBooking,
        confirmBooking,
        rescheduleDraft,
        updateRescheduleDraft,
        confirmReschedule,
        checkInPatient,
        callPatient,
        completeVisit,
        cancelAppointment,
        isOffline,
        setIsOffline,
        isSessionExpired,
        setIsSessionExpired,
        simulateSlotTaken,
        setSimulateSlotTaken,
        toastMessage,
        showToast,
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
