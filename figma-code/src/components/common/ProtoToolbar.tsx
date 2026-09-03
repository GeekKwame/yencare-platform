import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';

export const ProtoToolbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    activeShell,
    setActiveShell,
    patientScreen,
    setPatientScreen,
    staffScreen,
    setStaffScreen,
    appointments,
    checkInPatient,
    callPatient,
    completeVisit,
    isOffline,
    setIsOffline,
    resetDemoData,
    staffUser,
    setStaffRole,
  } = useClinic();

  const ama = appointments.find((a) => a.id === 'YC-4821');

  return (
    <aside
      aria-label="Prototype scenario simulator"
      className="fixed bottom-4 right-4 z-50 font-sans text-xs select-none"
    >
      {/* Floating Pill Trigger */}
      {!isOpen && (
        <div className="flex items-center gap-2 bg-[#111111] text-white px-3.5 py-2 shadow-xl border border-[#333333] hover:border-[#555555] transition-all">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#087F6C] animate-pulse"></span>
            <span className="text-[#8A948F]">Prototype:</span>
            <span className="text-white font-bold">{activeShell === 'PATIENT' ? 'Patient Web' : 'Staff Portal'}</span>
            <span className="text-[#8A948F]">· Ama ({ama?.status || 'BOOKED'})</span>
          </div>

          <div className="h-3.5 w-[1px] bg-[#333333] mx-1"></div>

          {/* Quick status progressor shortcut */}
          {ama?.status === 'BOOKED' && (
            <button
              onClick={() => checkInPatient('YC-4821')}
              className="px-2 py-0.5 bg-[#FEF7ED] text-[#B7791F] text-[10px] font-bold border border-[#FCD34D] hover:bg-[#FDE8CE] transition-colors cursor-pointer"
              title="Simulate reception check in"
            >
              Check In Ama (#4)
            </button>
          )}

          {ama?.status === 'WAITING' && (
            <button
              onClick={() => callPatient('YC-4821')}
              className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
              title="Simulate doctor calling Ama"
            >
              Call Ama (Room 3)
            </button>
          )}

          {ama?.status === 'CALLED' && (
            <button
              onClick={() => completeVisit('YC-4821')}
              className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
              title="Simulate doctor finishing consultation"
            >
              Complete Visit
            </button>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#8A948F] hover:text-white px-1.5 py-0.5 bg-[#222222] border border-[#333333] hover:border-[#666666] transition-colors cursor-pointer ml-1"
          >
            <span>All Screens</span>
            <span className="material-symbols-outlined text-[14px]">tune</span>
          </button>
        </div>
      )}

      {/* Expanded Scenario Panel Modal/Drawer */}
      {isOpen && (
        <div className="bg-[#111111] text-white border border-[#333333] shadow-2xl p-4 w-[92vw] max-w-[760px] max-h-[85vh] overflow-y-auto mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#087F6C]"></span>
              <span className="font-bold text-xs tracking-wider uppercase text-white">
                Prototype Testing & Scenario Simulator
              </span>
              <span className="text-[10px] text-[#8A948F]">· Dev Utility</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetDemoData}
                className="px-2 py-1 bg-[#222222] hover:bg-[#333333] text-[10px] font-semibold text-[#8A948F] hover:text-white border border-[#333333] transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset All Mock Data to Default"
              >
                <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                <span>Reset Demo</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#8A948F] hover:text-white hover:bg-[#222222] cursor-pointer"
                aria-label="Close scenario controls"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          {/* Quick Shell Switcher */}
          <div className="bg-[#1A1A1A] p-3 border border-[#2B2B2B] mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#8A948F]">Active View:</span>
              <div className="flex border border-[#333333] bg-black">
                <button
                  onClick={() => {
                    setActiveShell('PATIENT');
                    setIsOffline(false);
                  }}
                  className={`px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeShell === 'PATIENT' && !isOffline
                      ? 'bg-white text-black font-bold'
                      : 'text-[#8A948F] hover:text-white'
                  }`}
                >
                  Patient Web
                </button>
                <button
                  onClick={() => {
                    setActiveShell('STAFF');
                    setIsOffline(false);
                  }}
                  className={`px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeShell === 'STAFF' && !isOffline
                      ? 'bg-white text-black font-bold'
                      : 'text-[#8A948F] hover:text-white'
                  }`}
                >
                  Staff Portal
                </button>
              </div>
            </div>

            {/* Quick progression for canonical patient Ama */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-[#8A948F]">Ama Mensah (YC-4821):</span>
              <span className="px-2 py-0.5 font-mono text-[10px] bg-[#222222] border border-[#333333] text-[#087F6C]">
                {ama?.status || 'BOOKED'} {ama?.queueToken ? `(${ama.queueToken})` : ''}
              </span>
              {ama?.status === 'BOOKED' && (
                <button
                  onClick={() => checkInPatient('YC-4821')}
                  className="px-2 py-0.5 bg-[#FEF7ED] text-[#B7791F] text-[10px] font-bold border border-[#FCD34D] hover:bg-[#FDE8CE] transition-colors cursor-pointer"
                >
                  Check In →
                </button>
              )}
              {ama?.status === 'WAITING' && (
                <button
                  onClick={() => callPatient('YC-4821')}
                  className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
                >
                  Call Patient →
                </button>
              )}
              {ama?.status === 'CALLED' && (
                <button
                  onClick={() => completeVisit('YC-4821')}
                  className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
                >
                  Complete Visit →
                </button>
              )}
            </div>
          </div>

          {/* Screen Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
            {/* Column 1: Patient Booking */}
            <div className="space-y-2 bg-[#1A1A1A] p-3 border border-[#2B2B2B]">
              <div className="font-semibold text-white uppercase text-[10px] tracking-wider border-b border-[#333333] pb-1">
                Patient Booking Flow
              </div>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P01_HOME'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P01_HOME' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P01 Home Dashboard
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P02_DETAILS'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P02_DETAILS' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P02 Your Details (Name & Phone)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P03_DOCTOR'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P03_DOCTOR' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P03 Choose Doctor
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P04_05_DATE_TIME'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P04_05_DATE_TIME' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P04/P05 Date & Time Picker
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P06_REVIEW'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P06_REVIEW' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P06 Review Booking
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P07_CONFIRMED'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P07_CONFIRMED' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P07 Booking Confirmed
                </button>
              </div>
            </div>

            {/* Column 2: Manage & Queue */}
            <div className="space-y-2 bg-[#1A1A1A] p-3 border border-[#2B2B2B]">
              <div className="font-semibold text-white uppercase text-[10px] tracking-wider border-b border-[#333333] pb-1">
                Lookup & Live Queue
              </div>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P09_FIND'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P09_FIND' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P09 Find Appointment
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P11_DETAILS'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P11_DETAILS' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P11 Appointment Details
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P14_RESCHEDULE_DATE'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen.startsWith('P14') || patientScreen.startsWith('P15') || patientScreen.startsWith('P16') || patientScreen.startsWith('P17') ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P14–17 Reschedule Flow
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P12_CANCEL_CONFIRM'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P12_CANCEL_CONFIRM' || patientScreen === 'P13_CANCELLED' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P12/P13 Cancel Flow
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P18_QUEUE'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P18_QUEUE' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-white bg-[#087F6C]/20'}`}
                >
                  P18 Queue Status ({ama?.status})
                </button>
              </div>
            </div>

            {/* Column 3: Staff & Edge States */}
            <div className="space-y-2 bg-[#1A1A1A] p-3 border border-[#2B2B2B]">
              <div className="font-semibold text-white uppercase text-[10px] tracking-wider border-b border-[#333333] pb-1">
                Staff Ops & Test States
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S01_SIGN_IN'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S01_SIGN_IN' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S01 Sign In
                </button>
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S02_TODAY'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S02_TODAY' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S02 Today
                </button>
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S03_APPOINTMENTS'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S03_APPOINTMENTS' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S03 Roster
                </button>
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S04_APPOINTMENT_DETAIL'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S04_APPOINTMENT_DETAIL' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S04 Patient
                </button>
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S05_LIVE_QUEUE'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S05_LIVE_QUEUE' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S05 Queue
                </button>
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S05_EMPTY_QUEUE'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S05_EMPTY_QUEUE' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S05 Empty
                </button>
              </div>

              {/* Edge Scenarios */}
              <div className="pt-2 border-t border-[#333333] space-y-1">
                <div className="flex gap-1">
                  <button
                    onClick={() => { setIsOffline(!isOffline); setIsOpen(false); }}
                    className={`flex-1 p-1 border transition-colors text-[10px] cursor-pointer ${isOffline ? 'bg-[#C53030] text-white font-bold border-[#C53030]' : 'border-[#333333] hover:border-[#666666] text-[#C53030]'}`}
                  >
                    G01 Network Error
                  </button>
                  <button
                    onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P08_SLOT_TAKEN'); setIsOpen(false); }}
                    className={`flex-1 p-1 border transition-colors text-[10px] cursor-pointer ${patientScreen === 'P08_SLOT_TAKEN' ? 'bg-[#B7791F] text-white font-bold border-[#B7791F]' : 'border-[#333333] hover:border-[#666666] text-[#B7791F]'}`}
                  >
                    P08 Slot Conflict
                  </button>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <span className="text-[10px] text-[#8A948F]">Role:</span>
                  {(['Receptionist', 'Doctor', 'Admin'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setStaffRole(r)}
                      className={`px-1.5 py-0.5 text-[9px] border transition-colors cursor-pointer ${staffUser.role === r ? 'bg-white text-black font-bold border-white' : 'border-[#333333] text-[#8A948F] hover:text-white'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
