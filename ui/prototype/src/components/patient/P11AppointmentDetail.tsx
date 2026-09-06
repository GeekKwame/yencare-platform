import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { ReferenceBlock } from '../common/ReferenceBlock';
import { SmsModal } from '../common/SmsModal';
import { CLINIC_SITE_LABELS, VISIT_TYPE_LABELS } from '../../types/clinic';

export const P11AppointmentDetail: React.FC = () => {
  const { currentPatientAppointment, cancelAppointment, setPatientScreen, selfCheckIn } = useClinic();
  const app = currentPatientAppointment;
  const [smsOpen, setSmsOpen] = useState(false);

  if (!app) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-8 px-4">
        <div className="text-center">
          <p className="text-sm text-[#66706B]">Appointment not found.</p>
          <Button variant="secondary" size="md" onClick={() => setPatientScreen('P01_HOME')} className="mt-4">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const siteName = CLINIC_SITE_LABELS[app.clinicSite]?.name || "Students' Clinic";
  const visitLabel = VISIT_TYPE_LABELS[app.visitType] || 'General OPD';
  const isActive = ['BOOKED', 'WAITING', 'CALLED'].includes(app.status);
  const hasStaffChange = !!app.staffChangedTime;

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Back nav + status */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P01_HOME')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Home</span>
          </button>
          <StatusBadge status={app.status} token={app.queueToken} />
        </div>

        {/* Staff change banner */}
        {hasStaffChange && (
          <div className="bg-[#FEF7ED] border border-[#FCD34D] p-3.5 mb-5 text-left text-xs flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#B7791F] shrink-0 mt-0.5">info</span>
            <div>
              <strong className="text-[#B7791F] font-semibold block mb-0.5">
                Your appointment has been updated by the clinic.
              </strong>
              <span className="text-[#66706B]">
                Previous time: {app.staffChangedTime}
                {app.staffChangeReason && ` · Reason: ${app.staffChangeReason}`}
              </span>
            </div>
          </div>
        )}

        <div className="text-center mb-4">
          <div className="text-[11px] font-semibold text-[#66706B] uppercase tracking-wider mb-1">
            KNUST {siteName}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1">
            Your Appointment
          </h1>
          <p className="text-xs text-[#66706B] font-normal">
            {visitLabel}
          </p>
        </div>

        <ReferenceBlock code={app.id} />

        {/* Detail rows */}
        <div className="border border-[#D8DCD9] divide-y divide-[#E5E7E6] mb-5 text-xs">
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Patient</span>
            <span className="font-semibold text-[#111111]">{app.patientName}</span>
          </div>
          {app.studentIndex && (
            <div className="p-3.5 bg-white flex justify-between items-center">
              <span className="text-[#66706B] font-medium">Student Index</span>
              <span className="font-mono font-semibold text-[#111111]">{app.studentIndex}</span>
            </div>
          )}
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Phone</span>
            <span className="font-mono text-[#111111]">{app.phone}</span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Clinician</span>
            <span className="font-semibold text-[#111111]">
              {app.doctor.name} · {app.doctor.room}
            </span>
          </div>
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Date</span>
            <span className="font-semibold text-[#111111]">{app.date}</span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Time</span>
            <span className="font-bold text-[#087F6C]">{app.time}</span>
          </div>
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Clinic Site</span>
            <span className="font-semibold text-[#111111]">{siteName}</span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Visit Type</span>
            <span className="font-semibold text-[#111111]">{visitLabel}</span>
          </div>
          {(app.status === 'WAITING' || app.status === 'CALLED') && app.queueToken && (
            <div className="p-3.5 bg-[#E7F5F1]/30 flex justify-between items-center">
              <span className="text-[#087F6C] font-semibold">Queue Token</span>
              <span className="font-bold text-[#087F6C] font-mono text-base">{app.queueToken}</span>
            </div>
          )}
        </div>

        {/* SMS link */}
        <button
          onClick={() => setSmsOpen(true)}
          className="w-full text-left bg-[#F0F2F1] border border-[#D8DCD9] p-3 mb-5 text-xs flex items-center justify-between cursor-pointer hover:bg-[#E7F5F1]/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-[#111111]">
            <span className="material-symbols-outlined text-[16px] text-[#087F6C]">sms</span>
            <span className="font-semibold">View SMS Messages</span>
          </div>
          <span className="material-symbols-outlined text-[14px] text-[#8A948F]">chevron_right</span>
        </button>

        {/* Actions */}
        <div className="space-y-2.5">
          {app.status === 'BOOKED' && (
            <>
              {/* Pre-check-in queue information box */}
              <div className="bg-[#FEF7ED] border border-[#FCD34D] p-3.5 text-left text-xs mb-3 space-y-2">
                <div className="flex items-start gap-2 text-[#92400E]">
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0">info</span>
                  <div>
                    <strong className="font-semibold block text-[#78350F]">Not checked in at clinic yet</strong>
                    <p className="text-[#92400E] text-[11px] mt-0.5 leading-relaxed">
                      You will receive an individual queue token when you arrive at reception. Monitor overall clinic pace and wait times before leaving home.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#FCD34D]/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#78350F]">Already at reception?</span>
                  <button
                    onClick={() => selfCheckIn(app.id)}
                    className="bg-[#087F6C] hover:bg-[#066354] text-white font-bold text-[11px] px-3 py-1.5 rounded transition-colors shadow-2xs"
                  >
                    Simulate Check-In
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon="analytics"
                onClick={() => setPatientScreen('P10_CLINIC_ACTIVITY')}
              >
                View live clinic activity
              </Button>
            </>
          )}

          {(app.status === 'WAITING' || app.status === 'CALLED') && (
            <Button
              variant="accent"
              size="lg"
              fullWidth
              icon="schedule"
              onClick={() => setPatientScreen('P18_QUEUE')}
            >
              Check Queue Status
            </Button>
          )}

          {isActive && app.status === 'BOOKED' && (
            <>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                icon="edit_calendar"
                onClick={() => setPatientScreen('P14_RESCHEDULE_DATE')}
              >
                Reschedule
              </Button>

              <Button
                variant="destructive"
                size="md"
                fullWidth
                icon="cancel"
                onClick={() => setPatientScreen('P12_CANCEL_CONFIRM')}
              >
                Cancel appointment
              </Button>
            </>
          )}
        </div>
      </div>

      <SmsModal appointmentId={app.id} isOpen={smsOpen} onClose={() => setSmsOpen(false)} />
    </div>
  );
};
