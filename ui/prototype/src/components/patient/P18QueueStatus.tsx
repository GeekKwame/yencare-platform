import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { ReferenceBlock } from '../common/ReferenceBlock';
import { CLINIC_SITE_LABELS } from '../../types/clinic';

const QUEUE_STEPS = [
  { key: 'BOOKED', label: 'Booked', icon: 'calendar_today' },
  { key: 'CHECKED_IN', label: 'Checked In', icon: 'how_to_reg' },
  { key: 'WAITING', label: 'In Queue', icon: 'schedule' },
  { key: 'CALLED', label: 'Called', icon: 'notifications_active' },
  { key: 'COMPLETED', label: 'Completed', icon: 'check_circle' },
];

const STATUS_ORDER = ['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED', 'COMPLETED'];

export const P18QueueStatus: React.FC = () => {
  const { currentPatientAppointment, appointments, setPatientScreen } = useClinic();
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

  // Compute patients ahead
  const patientsAhead = isWaiting
    ? appointments.filter(
        (a) => a.status === 'WAITING' && a.id !== app.id
      ).length
    : 0;

  const estimatedWait = patientsAhead * 15;

  const siteName = CLINIC_SITE_LABELS[app.clinicSite]?.name || "Students' Clinic";

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-8">
        {/* Back nav */}
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

        {/* 5-Stage Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between relative">
            {QUEUE_STEPS.map((step, i) => {
              const isActive = STATUS_ORDER.indexOf(step.key) === statusIdx;
              const isPast = STATUS_ORDER.indexOf(step.key) < statusIdx;
              const isFuture = STATUS_ORDER.indexOf(step.key) > statusIdx;

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
            {siteName}
          </div>
        </div>

        {/* Queue Hero */}
        {isCalled ? (
          <div className="bg-[#E7F5F1] border-2 border-[#087F6C] p-6 md:p-8 text-center mb-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#087F6C] mb-2">
              It's Your Turn
            </div>
            <div className="font-queue-hero font-mono text-[#111111] mb-2 pulse-gentle">
              {app.queueToken || '#4'}
            </div>
            <h2 className="text-lg font-bold text-[#111111] mb-1">{app.patientName}</h2>
            <p className="text-sm font-semibold text-[#087F6C]">
              Please proceed to {app.assignedRoom || app.doctor.room || 'Room 1'}
            </p>
            <p className="text-xs text-[#66706B] mt-2">
              {app.doctor.name} is ready for you.
            </p>
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

            <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 mt-3 text-xs text-[#66706B] text-left flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#087F6C] shrink-0 mt-0.5">info</span>
              <span>You can wait nearby. We will notify you by SMS when it is almost your turn.</span>
            </div>
          </div>
        ) : isCompleted ? (
          <div className="text-center mb-5">
            <div className="bg-[#E7F5F1] border border-[#99D5C8] p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-[#087F6C] mb-2">check_circle</span>
              <h2 className="text-lg font-bold text-[#111111]">Visit Completed</h2>
              <p className="text-sm text-[#66706B] mt-1">Your consultation is complete. Take care.</p>
            </div>
          </div>
        ) : (
          <div className="text-center mb-5">
            <ReferenceBlock code={app.id} subtext="Show this code when you arrive at reception." />
          </div>
        )}

        {/* Appointment summary */}
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
