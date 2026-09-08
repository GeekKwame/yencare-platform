import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ConnectivityState } from '../../types/clinic';

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
    arrivePatient,
    callPatient,
    completeVisit,
    markNoShow,
    addWalkIn,
    changeAppointmentTime,
    connectivityState,
    setConnectivityState,
    isAfterHours,
    setIsAfterHours,
    resetDemoData,
    staffUser,
    setStaffRole,
    clinicActivityOverride,
    setClinicActivityOverride,
    setSelectedStaffAppointmentId,
    selectedStaffAppointmentId,
    currentPatientAppointment,
    setActivePatientAppointmentId,
  } = useClinic();

  const staffSelected = selectedStaffAppointmentId
    ? appointments.find((a) => a.id === selectedStaffAppointmentId)
    : undefined;
  const focused =
    activeShell === 'PATIENT'
      ? currentPatientAppointment || staffSelected
      : staffSelected || currentPatientAppointment;
  const givenName = focused?.patientName.trim().split(/\s+/)[0];

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
            <span className="text-[#8A948F]">YɛnCare Demo:</span>
            <span className="text-white font-bold">{activeShell === 'PATIENT' ? 'Patient Web' : 'Staff Portal'}</span>
            <span className="text-[#8A948F]">· {focused ? `${givenName} (${focused.status})` : 'No student session'}</span>
          </div>

          <div className="h-3.5 w-[1px] bg-[#333333] mx-1"></div>

          {/* Quick status progressor shortcut */}
          {focused?.status === 'BOOKED' && (
            <button
              onClick={() => arrivePatient(focused.id)}
              className="px-2 py-0.5 bg-[#FEF7ED] text-[#B7791F] text-[10px] font-bold border border-[#FCD34D] hover:bg-[#FDE8CE] transition-colors cursor-pointer"
              title="Student arrives at clinic"
            >
              Arrive
            </button>
          )}

          {focused?.status === 'CHECKED_IN' && (
            <button
              onClick={() => {
                checkInPatient(focused.id);
                setSelectedStaffAppointmentId(focused.id);
                setActiveShell('STAFF');
                setStaffScreen('S05_LIVE_QUEUE');
              }}
              className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
              title="Reception checks this student into the live queue"
            >
              Staff Check In
            </button>
          )}

          {focused?.status === 'WAITING' && (
            <button
              onClick={() => callPatient(focused.id, 'Room 2')}
              className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
              title="Call this student into Room 2"
            >
              Call (Room 2)
            </button>
          )}

          {focused?.status === 'CALLED' && (
            <button
              onClick={() => completeVisit(focused.id)}
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
            <span>Controls</span>
            <span className="material-symbols-outlined text-[14px]">tune</span>
          </button>
        </div>
      )}

      {/* Expanded Scenario Panel Modal/Drawer */}
      {isOpen && (
        <div className="bg-[#111111] text-white border border-[#333333] shadow-2xl p-4 w-[94vw] max-w-[840px] max-h-[88vh] overflow-y-auto mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#087F6C]"></span>
              <span className="font-bold text-xs tracking-wider uppercase text-white">
                YɛnCare · KNUST Students' Clinic · Prototype Testing Center
              </span>
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

          {/* Quick Shell Switcher & Scenario Shortcuts */}
          <div className="bg-[#1A1A1A] p-3 border border-[#2B2B2B] mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#8A948F]">Portal:</span>
              <div className="flex border border-[#333333] bg-black">
                <button
                  onClick={() => {
                    setActiveShell('PATIENT');
                  }}
                  className={`px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeShell === 'PATIENT'
                      ? 'bg-white text-black font-bold'
                      : 'text-[#8A948F] hover:text-white'
                  }`}
                >
                  Student Web
                </button>
                <button
                  onClick={() => {
                    setActiveShell('STAFF');
                  }}
                  className={`px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeShell === 'STAFF'
                      ? 'bg-white text-black font-bold'
                      : 'text-[#8A948F] hover:text-white'
                  }`}
                >
                  Staff Ops
                </button>
              </div>
            </div>

            {/* Quick progression for the focused student session */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-[#8A948F]">
                {focused ? `${givenName} (${focused.studentIndex || focused.id}):` : 'No student session:'}
              </span>
              <span className="px-2 py-0.5 font-mono text-[10px] bg-[#222222] border border-[#333333] text-[#087F6C]">
                {focused ? `${focused.status}${focused.queueToken ? ` (${focused.queueToken})` : ''}` : 'Book or find'}
              </span>
              {focused?.status === 'BOOKED' && (
                <button
                  onClick={() => arrivePatient(focused.id)}
                  className="px-2 py-0.5 bg-[#FEF7ED] text-[#B7791F] text-[10px] font-bold border border-[#FCD34D] hover:bg-[#FDE8CE] transition-colors cursor-pointer"
                >
                  Arrive →
                </button>
              )}
              {focused?.status === 'CHECKED_IN' && (
                <button
                  onClick={() => {
                    checkInPatient(focused.id);
                    setSelectedStaffAppointmentId(focused.id);
                    setActiveShell('STAFF');
                    setStaffScreen('S05_LIVE_QUEUE');
                  }}
                  className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
                >
                  Staff Check In →
                </button>
              )}
              {focused?.status === 'WAITING' && (
                <button
                  onClick={() => callPatient(focused.id, 'Room 2')}
                  className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
                >
                  Call Room 2 →
                </button>
              )}
              {focused?.status === 'CALLED' && (
                <button
                  onClick={() => completeVisit(focused.id)}
                  className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-bold border border-[#99D5C8] hover:bg-[#CBECE4] transition-colors cursor-pointer"
                >
                  Complete Visit →
                </button>
              )}
            </div>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="bg-[#181818] p-2.5 border border-[#2B2B2B] mb-4 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="font-semibold text-[#8A948F] uppercase">Scenario Triggers:</span>
            
            {/* Walk-in shortcut */}
            <button
              onClick={() => {
                addWalkIn({
                  patientName: 'Kofi Mensah',
                  studentIndex: '20698124',
                  phone: '024 111 2222',
                  visitType: 'general-opd',
                });
                setActiveShell('STAFF');
                setStaffScreen('S05_LIVE_QUEUE');
                setIsOpen(false);
              }}
              className="px-2 py-1 bg-[#2B6CB0] text-white font-semibold hover:bg-[#2C5282] transition-colors cursor-pointer"
            >
              + Simulate Walk-in (W-024)
            </button>

            {/* No-show shortcut */}
            <button
              onClick={() => {
                markNoShow('YC-4822');
                setActiveShell('STAFF');
                setStaffScreen('S03_APPOINTMENTS');
                setIsOpen(false);
              }}
              className="px-2 py-1 bg-[#9B2C2C] text-white font-semibold hover:bg-[#742A2A] transition-colors cursor-pointer"
            >
              Mark YC-4822 No-Show
            </button>

            {/* Staff Reschedule shortcut */}
            <button
              onClick={() => {
                if (!focused) return;
                changeAppointmentTime(focused.id, '10:30 AM', 'Doctor emergency consultation');
                setActivePatientAppointmentId(focused.id);
                setActiveShell('PATIENT');
                setPatientScreen('P11_DETAILS');
                setIsOpen(false);
              }}
              disabled={!focused}
              className="px-2 py-1 bg-[#D69E2E] text-black font-semibold hover:bg-[#B7791F] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Staff Change current to 10:30
            </button>

            {/* After-hours toggle */}
            <button
              onClick={() => {
                const nextState = !isAfterHours;
                setIsAfterHours(nextState);
                if (nextState) {
                  setActiveShell('PATIENT');
                  setPatientScreen('P19_AFTER_HOURS');
                }
                setIsOpen(false);
              }}
              className={`px-2 py-1 font-semibold transition-colors cursor-pointer ${
                isAfterHours
                  ? 'bg-[#805AD5] text-white'
                  : 'bg-[#222222] text-[#8A948F] border border-[#444444] hover:text-white'
              }`}
            >
              {isAfterHours ? 'Clinic Closed [ACTIVE]' : 'Toggle After-Hours (P19)'}
            </button>

            {/* Connectivity picker */}
            <div className="flex items-center gap-1 border border-[#333333] px-1.5 py-0.5 bg-black">
              <span className="text-[#8A948F]">Network:</span>
              {(['online', 'poor', 'offline', 'restored'] as ConnectivityState[]).map((cState) => (
                <button
                  key={cState}
                  onClick={() => setConnectivityState(cState)}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-bold transition-colors cursor-pointer ${
                    connectivityState === cState
                      ? cState === 'offline'
                        ? 'bg-[#C53030] text-white'
                        : cState === 'poor'
                        ? 'bg-[#D69E2E] text-black'
                        : cState === 'restored'
                        ? 'bg-[#087F6C] text-white'
                        : 'bg-white text-black'
                      : 'text-[#8A948F] hover:text-white'
                  }`}
                >
                  {cState}
                </button>
              ))}
            </div>

            {/* Queue Activity Simulator Override */}
            <div className="flex items-center gap-1 border border-[#333333] px-1.5 py-0.5 bg-black">
              <span className="text-[#8A948F]">Queue Load:</span>
              {(['normal', 'high-demand', 'empty', 'unavailable'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setClinicActivityOverride(mode)}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-bold transition-colors cursor-pointer ${
                    clinicActivityOverride === mode
                      ? mode === 'high-demand'
                        ? 'bg-[#C53030] text-white'
                        : mode === 'unavailable'
                        ? 'bg-[#D69E2E] text-black'
                        : 'bg-[#087F6C] text-white'
                      : 'text-[#8A948F] hover:text-white'
                  }`}
                >
                  {mode === 'high-demand' ? 'High Surge' : mode === 'empty' ? 'Empty' : mode === 'unavailable' ? 'Offline API' : 'Normal'}
                </button>
              ))}
            </div>
          </div>

          {/* Screen Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
            {/* Column 1: Patient Booking (6 Steps) */}
            <div className="space-y-2 bg-[#1A1A1A] p-3 border border-[#2B2B2B]">
              <div className="font-semibold text-white uppercase text-[10px] tracking-wider border-b border-[#333333] pb-1">
                Student Booking Flow (6 Steps)
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
                  P02 Student Details (Step 1/6)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P02B_CLINIC_SITE'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P02B_CLINIC_SITE' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P02B Clinic Site (Step 2/6)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P02C_VISIT_TYPE'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P02C_VISIT_TYPE' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P02C Visit Type & Emergency (Step 3/6)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P03_DOCTOR'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P03_DOCTOR' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P03 Choose Doctor (Step 4/6)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P04_05_DATE_TIME'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P04_05_DATE_TIME' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P04/P05 Date & Time (Step 5/6)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P06_REVIEW'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P06_REVIEW' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P06 Review Booking (Step 6/6)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P07_CONFIRMED'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P07_CONFIRMED' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P07 Confirmed (+ SMS Simulation)
                </button>
              </div>
            </div>

            {/* Column 2: Manage, Queue & After Hours */}
            <div className="space-y-2 bg-[#1A1A1A] p-3 border border-[#2B2B2B]">
              <div className="font-semibold text-white uppercase text-[10px] tracking-wider border-b border-[#333333] pb-1">
                Lookup, Queue & Status
              </div>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P09_FIND'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P09_FIND' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P09 Find Appointment (Index/Ref/Phone)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P10_CLINIC_ACTIVITY'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P10_CLINIC_ACTIVITY' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P10 Clinic Activity (Pre-Check-In)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P11_DETAILS'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P11_DETAILS' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P11 Appointment Details (+ Change Alert)
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P18_QUEUE'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P18_QUEUE' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-white bg-[#087F6C]/20'}`}
                >
                  P18 Queue Status ({focused?.status || 'no session'})
                </button>
                <button
                  onClick={() => { setActiveShell('PATIENT'); setPatientScreen('P19_AFTER_HOURS'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${patientScreen === 'P19_AFTER_HOURS' && activeShell === 'PATIENT' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  P19 Clinic Closed (After-Hours)
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
              </div>
            </div>

            {/* Column 3: Staff Operations */}
            <div className="space-y-2 bg-[#1A1A1A] p-3 border border-[#2B2B2B]">
              <div className="font-semibold text-white uppercase text-[10px] tracking-wider border-b border-[#333333] pb-1">
                Staff Operations Portal
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
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S06_WALK_IN'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S06_WALK_IN' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S06 Walk-In
                </button>
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S08_CHANGE_APPOINTMENT'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S08_CHANGE_APPOINTMENT' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S08 Change Time
                </button>
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S09_NO_SHOW_CONFIRM'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S09_NO_SHOW_CONFIRM' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S09 No-Show
                </button>
                <button
                  onClick={() => { setActiveShell('STAFF'); setStaffScreen('S10_DISPLAY_BOARD'); setIsOpen(false); }}
                  className={`text-left p-1.5 border transition-colors cursor-pointer ${staffScreen === 'S10_DISPLAY_BOARD' && activeShell === 'STAFF' ? 'bg-[#087F6C] text-white font-bold border-[#087F6C]' : 'border-[#333333] hover:border-[#666666] text-[#CCCCCC]'}`}
                >
                  S10 Corridor TV
                </button>
              </div>

              {/* Edge Scenarios */}
              <div className="pt-2 border-t border-[#333333] space-y-1">
                <div className="flex gap-1">
                  <button
                    onClick={() => { setConnectivityState(connectivityState === 'offline' ? 'online' : 'offline'); setIsOpen(false); }}
                    className={`flex-1 p-1 border transition-colors text-[10px] cursor-pointer ${connectivityState === 'offline' ? 'bg-[#C53030] text-white font-bold border-[#C53030]' : 'border-[#333333] hover:border-[#666666] text-[#C53030]'}`}
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
