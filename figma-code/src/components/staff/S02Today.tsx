import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

export const S02Today: React.FC = () => {
  const { appointments, setStaffScreen, setSelectedStaffAppointmentId } = useClinic();

  const totalBooked = appointments.length;
  const waitingCount = appointments.filter((a) => a.status === 'WAITING').length;
  const inConsultation = appointments.filter((a) => a.status === 'CALLED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  const todayList = appointments.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-[#D8DCD9] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
            Clinic Operations Dashboard
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
            Today's Clinical Operations
          </h1>
          <p className="text-xs font-normal text-[#66706B] mt-0.5">
            Tuesday 15 September 2026 · [Partner clinic] Outpatient Station
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStaffScreen('S03_APPOINTMENTS')}
            icon="calendar_month"
          >
            Roster ({totalBooked})
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
            icon="reorder"
          >
            Live Queue &rarr;
          </Button>
        </div>
      </div>

      {/* Metrics Row (Clinical Brutalism Counts Only per STITCH LOCK) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-[#D8DCD9] p-5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#66706B] mb-1">
            Total Bookings
          </div>
          <div className="text-4xl font-bold font-mono text-[#111111]">
            {totalBooked}
          </div>
          <div className="text-[11px] text-[#66706B] mt-2 font-normal">
            Scheduled for today
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-[#D8DCD9] p-5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#B7791F] mb-1">
            Waiting in Queue
          </div>
          <div className="text-4xl font-bold font-mono text-[#B7791F]">
            {waitingCount}
          </div>
          <div className="text-[11px] text-[#66706B] mt-2 font-normal">
            Checked in at reception
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-[#D8DCD9] p-5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#087F6C] mb-1">
            In Consultation
          </div>
          <div className="text-4xl font-bold font-mono text-[#087F6C]">
            {inConsultation}
          </div>
          <div className="text-[11px] text-[#66706B] mt-2 font-normal">
            Active in Room 3
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-[#D8DCD9] p-5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#66706B] mb-1">
            Completed Visits
          </div>
          <div className="text-4xl font-bold font-mono text-[#111111]">
            {completedCount}
          </div>
          <div className="text-[11px] text-[#66706B] mt-2 font-normal">
            Concluded consultations
          </div>
        </div>
      </div>

      {/* Clinical Station Info & Quick Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Quick Roster */}
        <div className="lg:col-span-2 bg-white border border-[#D8DCD9] shadow-xs">
          <div className="p-4 border-b border-[#E5E7E6] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              Today's Patients Overview
            </h2>
            <button
              onClick={() => setStaffScreen('S03_APPOINTMENTS')}
              className="text-xs font-semibold text-[#087F6C] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View all</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          <div className="divide-y divide-[#E5E7E6]">
            {todayList.map((app) => (
              <div
                key={app.id}
                onClick={() => {
                  setSelectedStaffAppointmentId(app.id);
                  setStaffScreen('S04_APPOINTMENT_DETAIL');
                }}
                className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-[#F7F8F7] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="font-reference font-semibold text-xs bg-[#F0F2F1] border border-[#D8DCD9] px-2 py-1 text-[#111111]">
                    {app.id}
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm text-[#111111]">{app.patientName}</h3>
                    <span className="text-xs text-[#66706B] font-normal">{app.time} · {app.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={app.status} token={app.queueToken} size="sm" />
                  <span className="material-symbols-outlined text-[16px] text-[#8A948F]">
                    chevron_right
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Consultation Room 3 Live Snapshot */}
        <div className="space-y-4">
          <div className="bg-white border border-[#D8DCD9] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E6] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Attending Clinician
              </span>
              <span className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-semibold uppercase">
                Active
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#111111] text-white flex items-center justify-center font-bold text-sm">
                KB
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111111]">Dr. Kwame Boateng</h3>
                <p className="text-xs text-[#66706B]">General Clinic · Room 3</p>
              </div>
            </div>

            <p className="text-xs text-[#66706B] leading-relaxed mb-4">
              Currently handling outpatient consultations. Estimated consultation duration: 15–20 min per patient.
            </p>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
              icon="open_in_new"
            >
              Open Live Queue Board
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
