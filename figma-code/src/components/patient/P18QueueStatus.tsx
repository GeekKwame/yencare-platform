import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { AppointmentStatus } from '../../types/clinic';

export const P18QueueStatus: React.FC = () => {
  const { currentPatientAppointment, setPatientScreen, showToast } = useClinic();
  const app = currentPatientAppointment;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const status: AppointmentStatus = app?.status || 'BOOKED';
  const token = app?.queueToken || '#4';
  const waitMinutes = app?.estimatedWaitMinutes || 30;
  const refCode = app?.id || 'YC-4821';

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Live queue status refreshed.');
    }, 400);
  };

  // 5-Stage Lifecycle Stepper
  // Stages: BOOKED -> CHECKED_IN -> WAITING -> CALLED -> COMPLETED
  const stages = [
    { key: 'BOOKED', label: 'Booked' },
    { key: 'CHECKED_IN', label: 'Checked in' },
    { key: 'WAITING', label: 'Waiting' },
    { key: 'CALLED', label: 'Called' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const getStageIndex = (s: AppointmentStatus) => {
    switch (s) {
      case 'BOOKED':
        return 0;
      case 'WAITING':
        return 2; // Booked (done), Checked In (done), Waiting (active)
      case 'CALLED':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(status);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[580px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        {/* Top Action Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P11_DETAILS')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Details</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 border border-[#D8DCD9] hover:bg-[#F0F2F1] text-[#111111] flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 cursor-pointer transition-colors"
              title="Refresh queue status"
            >
              <span className={`material-symbols-outlined text-[14px] ${isRefreshing ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh</span>
            </button>
            <StatusBadge status={status} token={token} />
          </div>
        </div>

        {/* 5-Step Lifecycle Stepper Component (Color + Text + Shape) */}
        {status !== 'CANCELLED' && (
          <div className="mb-8 p-3.5 bg-[#F7F8F7] border border-[#D8DCD9]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] mb-3 text-left">
              Queue Progress Lifecycle
            </div>
            <div className="flex items-center justify-between relative">
              {stages.map((st, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const isUpcoming = idx > currentStageIndex;

                return (
                  <div key={st.key} className="flex flex-col items-center flex-1 relative z-10">
                    <div
                      className={`w-6 h-6 flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-[#087F6C] text-white'
                          : isCurrent
                            ? 'bg-[#111111] text-white ring-2 ring-[#087F6C] ring-offset-2'
                            : 'bg-white text-[#8A948F] border border-[#D8DCD9]'
                      }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                      ) : (
                        <span className="text-[10px]">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 font-medium tracking-tight ${
                        isCurrent
                          ? 'text-[#111111] font-bold'
                          : isCompleted
                            ? 'text-[#087F6C]'
                            : 'text-[#8A948F]'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STATE 1: BOOKED (Before Arrival / Check-in)              */}
        {/* ========================================================= */}
        {status === 'BOOKED' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-[#F0F2F1] border border-[#D8DCD9] text-[#66706B] mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">event_upcoming</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
                You are not in the queue yet
              </h1>
              <p className="text-sm text-[#66706B] font-normal max-w-md mx-auto leading-relaxed">
                Your consultation is booked for <strong className="text-[#111111] font-semibold">{app?.date}, {app?.time}</strong>. Please arrive at [Partner clinic] and check in at reception to join the live queue.
              </p>
            </div>

            <div className="bg-[#F7F8F7] border border-[#D8DCD9] p-4 text-left text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Reference Code:</span>
                <span className="font-reference font-semibold text-[#111111]">{refCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Patient:</span>
                <span className="font-semibold text-[#111111]">{app?.patientName || 'Ama Mensah'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Attending Doctor:</span>
                <span className="font-semibold text-[#111111]">{app?.doctor.name || 'Dr. Kwame Boateng'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Location:</span>
                <span className="font-medium text-[#111111]">[Partner clinic]</span>
              </div>
            </div>

            <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 text-xs text-[#66706B] text-left leading-relaxed">
              <strong>Tip:</strong> Once the receptionist checks you in, this page will automatically display your live queue position and estimated wait time.
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setPatientScreen('P11_DETAILS')}
              >
                View appointment details
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STATE 2: WAITING (Checked In - High Visibility Hero)       */}
        {/* ========================================================= */}
        {status === 'WAITING' && (
          <div className="space-y-6">
            {/* Giant Queue Number Card */}
            <div className="bg-[#F7F8F7] border-2 border-[#111111] p-6 sm:p-8 text-center shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#66706B] mb-1">
                Your Queue Position
              </div>
              <div className="font-queue-hero font-mono text-[#111111] my-2 select-all">
                {token}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FEF7ED] border border-[#FCD34D] text-[#B7791F] text-xs font-semibold mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F]"></span>
                <span>4 patients ahead of you · WAITING</span>
              </div>

              <div className="pt-3 border-t border-[#D8DCD9] flex flex-col items-center">
                <div className="text-sm font-semibold text-[#111111]">
                  Estimated wait: 25–35 min
                </div>
                <p className="text-[11px] text-[#8A948F] font-normal mt-0.5">
                  Rough guide only · wait times vary depending on clinical consultations
                </p>
              </div>
            </div>

            {/* Information Grid */}
            <div className="border border-[#D8DCD9] p-4 bg-white text-left text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Patient:</span>
                <span className="font-semibold text-[#111111]">{app?.patientName || 'Ama Mensah'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Doctor:</span>
                <span className="font-semibold text-[#111111]">{app?.doctor.name || 'Dr. Kwame Boateng'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Reference Code:</span>
                <span className="font-reference font-semibold text-[#111111]">{refCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Assigned Room:</span>
                <span className="font-bold text-[#087F6C]">Consultation Room 3</span>
              </div>
            </div>

            <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 text-xs text-[#66706B] text-left leading-relaxed">
              Please stay within hearing distance of the waiting area. When your number is called, this screen will notify you to proceed to Room 3.
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setPatientScreen('P11_DETAILS')}
              >
                View appointment
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STATE 3: CALLED (It Is Your Turn)                         */}
        {/* ========================================================= */}
        {status === 'CALLED' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-[#E7F5F1] text-[#087F6C] border-2 border-[#087F6C] rounded-full mx-auto flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-4xl">
                notifications_active
              </span>
            </div>

            <div>
              <div className="inline-block px-3 py-1 bg-[#087F6C] text-white text-xs font-bold uppercase tracking-widest mb-2">
                Active Call
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#111111] mb-1">
                It is your turn
              </h1>
              <p className="text-sm font-semibold text-[#087F6C]">
                Please proceed immediately to the consultation room.
              </p>
            </div>

            {/* High Contrast Direction Box */}
            <div className="bg-[#111111] text-white p-6 sm:p-8 border-2 border-[#111111] text-center my-4">
              <div className="text-xs uppercase tracking-widest text-[#8A948F] font-semibold mb-1.5">
                Consultation Location
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-wide text-white mb-1.5">
                Consultation Room 3
              </div>
              <div className="text-sm text-[#CCCCCC] font-normal">
                Dr. Kwame Boateng is ready for you
              </div>
              <div className="mt-4 pt-3 border-t border-[#333333] text-xs text-[#8A948F] font-mono">
                Queue Token: {token} · Reference: {refCode}
              </div>
            </div>

            <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 text-xs text-[#66706B] text-left leading-relaxed">
              If you need assistance reaching Room 3, please alert the reception desk.
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setPatientScreen('P11_DETAILS')}
              >
                View appointment
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STATE 4: COMPLETED (Visit Finished)                       */}
        {/* ========================================================= */}
        {status === 'COMPLETED' && (
          <div className="space-y-6">
            <div className="w-14 h-14 bg-[#E7F5F1] text-[#087F6C] border border-[#99D5C8] rounded-full mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] mb-2">
                Your visit is finished
              </h1>
              <p className="text-sm text-[#66706B] font-normal max-w-md mx-auto leading-relaxed">
                Thank you for visiting [Partner clinic]. Your consultation with Dr. Kwame Boateng has concluded.
              </p>
            </div>

            <div className="border border-[#D8DCD9] p-4 bg-[#F7F8F7] text-left text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Reference Code:</span>
                <span className="font-reference font-semibold text-[#111111]">{refCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Patient:</span>
                <span className="font-semibold text-[#111111]">{app?.patientName || 'Ama Mensah'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Doctor:</span>
                <span className="font-semibold text-[#111111]">{app?.doctor.name || 'Dr. Kwame Boateng'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#66706B] font-normal">Status:</span>
                <span className="font-semibold text-[#087F6C]">Completed</span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setPatientScreen('P02_DETAILS')}
                icon="calendar_month"
              >
                Book another appointment
              </Button>

              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setPatientScreen('P01_HOME')}
              >
                Return to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
