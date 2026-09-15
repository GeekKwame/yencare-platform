import React, { useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { YenCareLogo } from '../common/YenCareLogo';
import { StatusBadge } from '../common/StatusBadge';
import { CLINIC_SITE_LABELS } from '../../types/clinic';

export const P01Home: React.FC = () => {
  const { setPatientScreen, isAfterHours, currentPatientAppointment, getClinicActivity } = useClinic();
  const activity = getClinicActivity('students-clinic');

  useEffect(() => {
    if (isAfterHours) {
      setPatientScreen('P19_AFTER_HOURS');
    }
  }, [isAfterHours, setPatientScreen]);

  if (isAfterHours) {
    return null;
  }

  const app = currentPatientAppointment;
  const isLive = app && ['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED'].includes(app.status);
  const siteName = app ? CLINIC_SITE_LABELS[app.clinicSite]?.name : "Students' Clinic";

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-10 md:py-16 px-4">
      <div className="w-full max-w-[600px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 sm:p-10 text-center">
        <div className="mb-7 flex flex-col items-center">
          <YenCareLogo variant="hero" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] mb-2">
          Akwaaba
        </h1>
        <p className="text-sm sm:text-base text-[#66706B] font-normal mb-8 max-w-md mx-auto leading-relaxed">
          Book a visit at KNUST Students' Clinic, find an existing appointment, or check your queue.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-8 text-left">
          <div className="border border-[#D8DCD9] p-3 bg-[#F7F8F7]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B]">Now serving</div>
            <div className="font-mono font-bold text-lg text-[#111111] mt-0.5">{activity.nowServingToken || '—'}</div>
          </div>
          <div className="border border-[#D8DCD9] p-3 bg-[#F7F8F7]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B]">Waiting</div>
            <div className="font-mono font-bold text-lg text-[#111111] mt-0.5">{activity.waitingCount}</div>
          </div>
          <div className="border border-[#D8DCD9] p-3 bg-[#F7F8F7]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B]">Est. wait</div>
            <div className="font-bold text-lg text-[#111111] mt-0.5">
              {activity.estimatedWaitMinutes === 0 ? '—' : `~${activity.estimatedWaitMinutes}m`}
            </div>
          </div>
        </div>

        {isLive && app && (
          <div className="bg-[#F7F8F7] border border-[#D8DCD9] p-4 text-left mb-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] mb-1">
                  Your appointment today
                </div>
                <div className="font-bold text-sm text-[#111111]">{app.patientName}</div>
                <div className="text-xs text-[#66706B] mt-0.5">
                  {siteName} · {app.time} · {app.id}
                </div>
              </div>
              <StatusBadge status={app.status} token={app.queueToken} size="sm" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {app.status === 'BOOKED' && (
                <Button
                  variant="accent"
                  size="sm"
                  fullWidth
                  icon="location_on"
                  onClick={() => setPatientScreen('P11_DETAILS')}
                >
                  Manage / I've arrived
                </Button>
              )}
              {app.status === 'CHECKED_IN' && (
                <Button
                  variant="accent"
                  size="sm"
                  fullWidth
                  icon="how_to_reg"
                  onClick={() => setPatientScreen('P18_QUEUE')}
                >
                  Waiting for reception
                </Button>
              )}
              {(app.status === 'WAITING' || app.status === 'CALLED') && (
                <Button
                  variant="accent"
                  size="sm"
                  fullWidth
                  icon="schedule"
                  onClick={() => setPatientScreen('P18_QUEUE')}
                >
                  Open live queue
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                icon="visibility"
                onClick={() => setPatientScreen('P11_DETAILS')}
              >
                View details
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon="calendar_month"
            onClick={() => setPatientScreen('P02_DETAILS')}
          >
            Book an appointment
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon="search"
            onClick={() => setPatientScreen('P09_FIND')}
          >
            Find my appointment
          </Button>
        </div>

        <div className="bg-[#E7F5F1]/50 border border-[#99D5C8] p-4 sm:p-5 text-left mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#087F6C]">
                <span className="material-symbols-outlined text-[16px] text-[#087F6C]">
                  pulse_alert
                </span>
                <span>Live Clinic Queue Activity</span>
              </div>
              <p className="text-xs text-[#3D4541] font-normal mt-1">
                See who's currently being served, waiting count, and estimated wait times before heading to the clinic.
              </p>
            </div>
            <button
              onClick={() => setPatientScreen('P10_CLINIC_ACTIVITY')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#087F6C] hover:bg-[#066354] text-white text-xs font-semibold tracking-wide transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              <span>View activity</span>
              <span className="material-symbols-outlined text-[16px]">analytics</span>
            </button>
          </div>
        </div>

        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-4 sm:p-5 text-left mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111]">
                <span className="material-symbols-outlined text-[16px] text-[#087F6C]">
                  schedule
                </span>
                <span>Already in the live queue?</span>
              </div>
              <p className="text-xs text-[#66706B] font-normal mt-1">
                Check your assigned queue token and live position after reception check-in.
              </p>
            </div>
            <button
              onClick={() => setPatientScreen(app ? 'P18_QUEUE' : 'P09_FIND')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#E7F5F1] text-[#087F6C] border border-[#D8DCD9] hover:border-[#087F6C] text-xs font-semibold tracking-wide transition-colors shrink-0 cursor-pointer"
            >
              <span>Check queue</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="border-t border-[#E5E7E6] pt-5 text-left flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[#66706B] text-[18px] shrink-0 mt-0.5">
            sms
          </span>
          <p className="text-xs text-[#66706B] font-normal leading-relaxed">
            We send a confirmation text after you book. Standard rates may apply depending on your carrier in Ghana.
          </p>
        </div>
      </div>
    </div>
  );
};
