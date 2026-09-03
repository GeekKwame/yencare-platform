import React from 'react';
import { useClinic } from './context';
import { ProtoToolbar, Toast } from './components/common';

// Patient Components
import {
  PatientHeader,
  P01Home,
  P02YourDetails,
  P03ChooseDoctor,
  P04P05DateTime,
  P06ReviewBooking,
  P07BookingConfirmed,
  P08SlotTaken,
  P09FindAppointment,
  P11AppointmentDetail,
  P12CancelConfirm,
  P13AppointmentCancelled,
  P14P17RescheduleFlow,
  P18QueueStatus,
} from './components/patient';

// Staff Components
import {
  StaffLayout,
  S01SignIn,
  S02Today,
  S03Appointments,
  S04PatientDetail,
  S05LiveQueue,
  S05EmptyQueue,
  S07SessionExpired,
} from './components/staff';

// Edge Components
import { G01NetworkError } from './components/edge';


export const App: React.FC = () => {
  const {
    activeShell,
    patientScreen,
    staffScreen,
    isOffline,
    toastMessage,
  } = useClinic();

  // Edge state: Network error overrides view
  if (isOffline) {
    return (
      <div className="min-h-screen bg-[#F7F8F7] flex flex-col font-sans">
        <ProtoToolbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <G01NetworkError />
        </main>
        <Toast message={toastMessage} />
      </div>
    );
  }

  // Shell 1: Patient Web Experience
  if (activeShell === 'PATIENT') {
    return (
      <div className="min-h-screen bg-[#F7F8F7] flex flex-col font-sans">
        <PatientHeader />
        
        <main className="flex-1 flex flex-col">
          {patientScreen === 'P01_HOME' && <P01Home />}
          {patientScreen === 'P02_DETAILS' && <P02YourDetails />}
          {patientScreen === 'P03_DOCTOR' && <P03ChooseDoctor />}
          {patientScreen === 'P04_05_DATE_TIME' && <P04P05DateTime />}
          {patientScreen === 'P06_REVIEW' && <P06ReviewBooking />}
          {patientScreen === 'P07_CONFIRMED' && <P07BookingConfirmed />}
          {patientScreen === 'P08_SLOT_TAKEN' && <P08SlotTaken />}
          {patientScreen === 'P09_FIND' && <P09FindAppointment />}
          {patientScreen === 'P11_DETAILS' && <P11AppointmentDetail />}
          {patientScreen === 'P12_CANCEL_CONFIRM' && <P12CancelConfirm />}
          {patientScreen === 'P13_CANCELLED' && <P13AppointmentCancelled />}
          {(patientScreen === 'P14_RESCHEDULE_DATE' ||
            patientScreen === 'P15_RESCHEDULE_TIME' ||
            patientScreen === 'P16_RESCHEDULE_REVIEW' ||
            patientScreen === 'P17_RESCHEDULE_CONFIRMED') && (
            <P14P17RescheduleFlow />
          )}
          {patientScreen === 'P18_QUEUE' && <P18QueueStatus />}
        </main>

        <footer className="border-t border-[#D8DCD9] bg-white py-5 px-4 text-center mt-auto">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-normal text-[#66706B]">
            <div className="flex items-center gap-2 font-semibold text-[#111111]">
              <span className="w-2 h-2 rounded-full bg-[#087F6C]"></span>
              <span>YɛnCare · [Partner clinic]</span>
            </div>
            <div>
              Ghana outpatient clinic scheduling & live queue access.
            </div>
          </div>
        </footer>

        {/* Prototype scenario toolbar (rendered as floating controller) */}
        <ProtoToolbar />
        <Toast message={toastMessage} />
      </div>
    );
  }

  // Shell 2: Staff Clinical Operations Portal
  return (
    <div className="min-h-screen bg-[#F7F8F7] flex flex-col font-sans">
      {staffScreen === 'S01_SIGN_IN' ? (
        <S01SignIn />
      ) : staffScreen === 'S07_SESSION_EXPIRED' ? (
        <S07SessionExpired />
      ) : (
        <StaffLayout>
          {staffScreen === 'S02_TODAY' && <S02Today />}
          {staffScreen === 'S03_APPOINTMENTS' && <S03Appointments />}
          {staffScreen === 'S04_APPOINTMENT_DETAIL' && <S04PatientDetail />}
          {staffScreen === 'S05_LIVE_QUEUE' && <S05LiveQueue />}
          {staffScreen === 'S05_EMPTY_QUEUE' && <S05EmptyQueue />}
        </StaffLayout>
      )}

      {/* Prototype scenario toolbar (rendered as floating controller) */}
      <ProtoToolbar />
      <Toast message={toastMessage} />
    </div>
  );
};
