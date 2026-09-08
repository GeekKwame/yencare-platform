import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { ReferenceBlock } from '../common/ReferenceBlock';
import { CLINIC_SITE_LABELS } from '../../types/clinic';
import { patientsAheadOf } from '../../lib/clinicQueue';
import { announcePatientCall } from '../../lib/clinicSpeech';

const QUEUE_STEPS = [
  { key: 'BOOKED', label: 'Booked', icon: 'calendar_today' },
  { key: 'CHECKED_IN', label: 'Checked In', icon: 'how_to_reg' },
  { key: 'WAITING', label: 'In Queue', icon: 'schedule' },
  { key: 'CALLED', label: 'Called', icon: 'notifications_active' },
  { key: 'COMPLETED', label: 'Completed', icon: 'check_circle' },
];

const STATUS_ORDER = ['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED', 'COMPLETED'];

export const P18QueueStatus: React.FC = () => {
  const {
    currentPatientAppointment,
    appointments,
    setPatientScreen,
    arrivePatient,
    setActiveShell,
    setStaffScreen,
    setSelectedStaffAppointmentId,
  } = useClinic();
  const app = currentPatientAppointment;

  if (!app) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-8 px-4">
        <div className="text-center">
          <p className="text-sm text-[#66706B]">Appointment not found.</p>
          <Button variant="secondary" size="md" onClick={() => setPatientScreen('P09_FIND')} className="mt-4">
            Find Appointment
          </Button>
        </div>
      </div>
    );
  }

  const statusIdx = STATUS_ORDER.indexOf(app.status);
  const isWaiting = app.status === 'WAITING';
  const isCalled = app.status === 'CALLED';
  const isCompleted = app.status === 'COMPLETED';
  const isArrived = app.status === 'CHECKED_IN';
  const isBooked = app.status === 'BOOKED';

  const patientsAhead = patientsAheadOf(app, appointments);
  const estimatedWait = patientsAhead * 8 + (isWaiting ? 15 : 0);
  const siteName = CLINIC_SITE_LABELS[app.clinicSite]?.name || "Students' Clinic";
  const roomLabel = app.assignedRoom || app.doctor.room || 'Room 1';

  const openStaffDesk = () => {
    setSelectedStaffAppointmentId(app.id);
    setActiveShell('STAFF');
    setStaffScreen('S04_APPOINTMENT_DETAIL');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-8">
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P11_DETAILS')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Appointment</span>
          </button>
          <div className="text-[11px] font-semibold text-[#66706B] uppercase tracking-wider">
            Live Queue
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between relative">
            {QUEUE_STEPS.map((step, i) => {
              const isActive = STATUS_ORDER.indexOf(step.key) === statusIdx;
              const isPast = STATUS_ORDER.indexOf(step.key) < statusIdx;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center relative z-10">
                    <div className={`w-8 h-8 flex items-center justify-center transition-all ${
                      isPast
                        ? 'bg-[#087F6C] text-white'
                        : isActive
                          ? 'bg-[#111111] text-white shadow-md'
                          : 'bg-[#F0F2F1] text-[#8A948F] border border-[#D8DCD9]'
                    }`}>
                      <span className="material-symbols-outlined text-[16px]">{step.icon}</span>
                    </div>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider mt-1.5 text-center ${
                      isActive ? 'text-[#111111]' : isPast ? 'text-[#087F6C]' : 'text-[#8A948F]'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {i < QUEUE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${
                      isPast ? 'bg-[#087F6C]' : 'bg-[#E5E7E6]'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="text-center mb-1">
          <div className="text-[11px] font-semibold text-[#66706B] uppercase tracking-wider mb-1">
            KNUST {siteName}
          </div>
        </div>

        {isCalled ? (
          <div className="bg-[#E7F5F1] border-2 border-[#087F6C] p-6 md:p-8 text-center mb-5 call-flash">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#087F6C] mb-2">
              It's Your Turn
            </div>
            <div className="font-queue-hero font-mono text-[#111111] mb-2 pulse-gentle">
              {app.queueToken || '#4'}
            </div>
            <h2 className="text-lg font-bold text-[#111111] mb-1">{app.patientName}</h2>
            <p className="text-sm font-semibold text-[#087F6C]">
              Please proceed to {roomLabel}
            </p>
            <p className="text-xs text-[#66706B] mt-2">
              {app.doctor.name} is ready for you.
            </p>
            <button
              type="button"
              onClick={() => announcePatientCall(app.patientName, roomLabel, app.queueToken)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#087F6C] text-[#087F6C] text-xs font-semibold cursor-pointer hover:bg-[#E7F5F1]"
            >
              <span className="material-symbols-outlined text-[16px]">volume_up</span>
              Replay call
            </button>
          </div>
        ) : isWaiting ? (
          <div className="text-center mb-5">
            <div className="bg-[#FEF7ED] border border-[#FCD34D] p-6 md:p-8">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#B7791F] mb-2">
                Your Queue Token
              </div>
              <div className="font-queue-hero font-mono text-[#111111] mb-3">
                {app.queueToken || '#4'}
              </div>
              <h2 className="text-lg font-bold text-[#111111] mb-1">{app.patientName}</h2>
              <div className="flex items-center justify-center gap-3 text-sm mt-3 pt-3 border-t border-[#FCD34D]/40">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono text-[#B7791F]">{patientsAhead}</div>
                  <div className="text-[10px] text-[#66706B] font-medium uppercase tracking-wider">Ahead</div>
                </div>
                <div className="w-px h-8 bg-[#FCD34D]/50"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono text-[#B7791F]">~{estimatedWait || 15}m</div>
                  <div className="text-[10px] text-[#66706B] font-medium uppercase tracking-wider">Est. Wait</div>
                </div>
              </div>
            </div>

            {patientsAhead >= 2 ? (
              <div className="bg-[#E7F5F1] border border-[#99D5C8] p-3.5 mt-3 text-xs text-[#066A5A] text-left flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#087F6C] shrink-0 mt-0.5">directions_walk</span>
                <span>
                  <strong className="text-[#087F6C]">You can wait nearby</strong> — library, faculty, or campus shade.
                  Come back when 1 person remains. We will also text you.
                </span>
              </div>
            ) : patientsAhead === 1 ? (
              <div className="bg-[#FEF7ED] border border-[#FCD34D] p-3.5 mt-3 text-xs text-[#78350F] text-left flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#B7791F] shrink-0 mt-0.5">priority_high</span>
                <span>
                  <strong>You're next.</strong> Please return to the clinic waiting area. You may be called shortly.
                </span>
              </div>
            ) : (
              <div className="bg-[#FEF7ED] border border-[#FCD34D] p-3.5 mt-3 text-xs text-[#78350F] text-left flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#B7791F] shrink-0 mt-0.5">notifications_active</span>
                <span>
                  <strong>You're at the front of the queue.</strong> Stay at the clinic — you will be called next.
                </span>
              </div>
            )}
          </div>
        ) : isCompleted ? (
          <div className="text-center mb-5">
            <div className="bg-[#E7F5F1] border border-[#99D5C8] p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-[#087F6C] mb-2">check_circle</span>
              <h2 className="text-lg font-bold text-[#111111]">Visit Completed</h2>
              <p className="text-sm text-[#66706B] mt-1">Your consultation is complete. Take care.</p>
            </div>
          </div>
        ) : isArrived ? (
          <div className="text-center mb-5">
            <div className="bg-[#E7F5F1] border border-[#99D5C8] p-6 text-center mb-4">
              <div className="inline-flex items-center gap-1.5 bg-white border border-[#99D5C8] text-[#087F6C] text-xs font-bold px-2.5 py-1 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#087F6C]"></span>
                ARRIVED · AWAITING RECEPTION
              </div>
              <h2 className="text-lg font-bold text-[#111111] mb-1">
                Reception will add you to the queue
              </h2>
              <p className="text-xs text-[#66706B] max-w-sm mx-auto leading-relaxed mb-4">
                You've told YɛnCare you're here. Present this reference at the desk. Staff check-in assigns your live queue token.
              </p>

              <ReferenceBlock code={app.id} subtext="Show this code to the receptionist." />

              <div className="mt-4 pt-4 border-t border-[#99D5C8]/50 flex flex-col sm:flex-row gap-2.5">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  icon="badge"
                  onClick={openStaffDesk}
                >
                  Demo: open reception desk
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  icon="analytics"
                  onClick={() => setPatientScreen('P10_CLINIC_ACTIVITY')}
                >
                  Clinic activity
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-5">
            <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-6 text-center mb-4">
              <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold px-2.5 py-1 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                BOOKED · NOT ARRIVED
              </div>
              <h2 className="text-lg font-bold text-[#111111] mb-1">
                Queue position pending check-in
              </h2>
              <p className="text-xs text-[#66706B] max-w-sm mx-auto leading-relaxed mb-4">
                Personal queue numbers are assigned when reception checks you in at the desk. You do not have a queue number yet.
              </p>

              <ReferenceBlock code={app.id} subtext="Present this reference to reception when you arrive." />

              <div className="mt-4 pt-4 border-t border-[#D8DCD9] flex flex-col sm:flex-row gap-2.5">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  icon="analytics"
                  onClick={() => setPatientScreen('P10_CLINIC_ACTIVITY')}
                >
                  View live clinic activity
                </Button>
                {isBooked && (
                  <Button
                    variant="accent"
                    size="md"
                    fullWidth
                    icon="location_on"
                    onClick={() => arrivePatient(app.id)}
                  >
                    I've arrived
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="border border-[#D8DCD9] divide-y divide-[#E5E7E6] mb-5 text-xs">
          <div className="p-3 bg-[#F7F8F7] flex justify-between">
            <span className="text-[#66706B]">Clinician</span>
            <span className="font-semibold text-[#111111]">{app.doctor.name}</span>
          </div>
          <div className="p-3 bg-white flex justify-between">
            <span className="text-[#66706B]">Room</span>
            <span className="font-semibold text-[#111111]">{app.assignedRoom || app.doctor.room || 'Room 1'}</span>
          </div>
          <div className="p-3 bg-[#F7F8F7] flex justify-between">
            <span className="text-[#66706B]">Scheduled Time</span>
            <span className="font-semibold text-[#111111]">{app.time}</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setPatientScreen('P11_DETAILS')}
            icon="arrow_back"
          >
            View full appointment details
          </Button>
          <Button
            variant="tertiary"
            onClick={() => setPatientScreen('P01_HOME')}
          >
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};
