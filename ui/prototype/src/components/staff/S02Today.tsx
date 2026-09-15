import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { useAccraClock } from '../../lib/accraTime';

export const S02Today: React.FC = () => {
  const { appointments, setStaffScreen, setSelectedStaffAppointmentId, checkInPatient, showToast } = useClinic();
  const { time, isOpen } = useAccraClock();
  const [deskQuery, setDeskQuery] = useState('');

  const totalBooked = appointments.length;
  const arrivedCount = appointments.filter((a) => a.status === 'CHECKED_IN').length;
  const waitingCount = appointments.filter((a) => a.status === 'WAITING').length;
  const inConsultation = appointments.filter((a) => a.status === 'CALLED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const noShowCount = appointments.filter((a) => a.status === 'NO_SHOW').length;
  const walkInCount = appointments.filter((a) => a.bookingType === 'WALK_IN').length;
  const arrivedPatients = appointments.filter((a) => a.status === 'CHECKED_IN');
  const room1 = appointments.find((a) => a.status === 'CALLED' && (a.assignedRoom === 'Room 1' || a.doctor.room === 'Room 1'));
  const room2 = appointments.find((a) => a.status === 'CALLED' && (a.assignedRoom === 'Room 2' || a.doctor.room === 'Room 2'));

  const statusRank: Record<string, number> = {
    CHECKED_IN: 0,
    BOOKED: 1,
    WAITING: 2,
    CALLED: 3,
    COMPLETED: 4,
    NO_SHOW: 5,
    CANCELLED: 6,
  };
  const todayList = [...appointments]
    .sort((a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9))
    .slice(0, 8);

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
            Tuesday 15 September 2026 · {time} Accra · {isOpen ? 'Clinic open' : 'Clinic closed'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStaffScreen('S06_WALK_IN')}
            icon="person_add"
          >
            + Add Walk-In
          </Button>
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStaffScreen('S10_DISPLAY_BOARD')}
            icon="tv"
          >
            Corridor TV
          </Button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = deskQuery.trim().replace(/\s+/g, '').toUpperCase();
          if (!q) return;
          const found = appointments.find((a) => {
            const phone = a.phone.replace(/\s+/g, '').toUpperCase();
            return (
              a.id.toUpperCase() === q ||
              a.id.toUpperCase().includes(q) ||
              (a.studentIndex && a.studentIndex.toUpperCase() === q) ||
              phone === q ||
              phone.endsWith(q) ||
              a.patientName.toUpperCase().includes(deskQuery.trim().toUpperCase())
            );
          });
          if (!found) {
            showToast('No student found. Search by YC reference, student index, phone, or name from today’s roster.');
            return;
          }
          setSelectedStaffAppointmentId(found.id);
          setStaffScreen('S04_APPOINTMENT_DETAIL');
        }}
        className="bg-white border border-[#D8DCD9] p-3.5 flex flex-col sm:flex-row gap-2.5 shadow-xs"
      >
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8A948F] text-[18px]">
            badge
          </span>
          <input
            type="text"
            value={deskQuery}
            onChange={(e) => setDeskQuery(e.target.value)}
            placeholder="Desk lookup: YC reference, student index, phone, or name…"
            className="w-full pl-9 pr-3 py-2 text-xs font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none"
          />
        </div>
        <Button type="submit" variant="accent" size="sm" icon="search">
          Find & open record
        </Button>
      </form>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="bg-white border border-[#D8DCD9] p-4 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] mb-1">
            Total Patients
          </div>
          <div className="text-3xl font-bold font-mono text-[#111111]">
            {totalBooked}
          </div>
          <div className="text-[10px] text-[#66706B] mt-1 font-normal">
            Roster today
          </div>
        </div>

        <div className="bg-white border border-[#087F6C] p-4 shadow-xs bg-[#E7F5F1]/30">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#087F6C] mb-1">
            Arrived
          </div>
          <div className="text-3xl font-bold font-mono text-[#087F6C]">
            {arrivedCount}
          </div>
          <div className="text-[10px] text-[#66706B] mt-1 font-normal">
            Awaiting desk
          </div>
        </div>

        <div className="bg-white border border-[#D8DCD9] p-4 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#B7791F] mb-1">
            In Queue
          </div>
          <div className="text-3xl font-bold font-mono text-[#B7791F]">
            {waitingCount}
          </div>
          <div className="text-[10px] text-[#66706B] mt-1 font-normal">
            Live waiting
          </div>
        </div>

        <div className="bg-white border border-[#D8DCD9] p-4 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#087F6C] mb-1">
            In Consult
          </div>
          <div className="text-3xl font-bold font-mono text-[#087F6C]">
            {inConsultation}
          </div>
          <div className="text-[10px] text-[#66706B] mt-1 font-normal">
            Rooms 1 & 2
          </div>
        </div>

        <div className="bg-white border border-[#D8DCD9] p-4 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] mb-1">
            Completed
          </div>
          <div className="text-3xl font-bold font-mono text-[#111111]">
            {completedCount}
          </div>
          <div className="text-[10px] text-[#66706B] mt-1 font-normal">
            Concluded
          </div>
        </div>

        <div className="bg-white border border-[#2B6CB0] p-4 shadow-xs bg-[#EBF8FF]/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#2B6CB0] mb-1">
            Walk-Ins
          </div>
          <div className="text-3xl font-bold font-mono text-[#2B6CB0]">
            {walkInCount}
          </div>
          <div className="text-[10px] text-[#66706B] mt-1 font-normal">
            Unscheduled
          </div>
        </div>

        <div className="bg-white border border-[#9B2C2C] p-4 shadow-xs bg-[#FFF5F5]/30">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9B2C2C] mb-1">
            No-Shows
          </div>
          <div className="text-3xl font-bold font-mono text-[#9B2C2C]">
            {noShowCount}
          </div>
          <div className="text-[10px] text-[#66706B] mt-1 font-normal">
            Missed slots
          </div>
        </div>
      </div>

      {arrivedCount > 0 && (
        <div className="bg-[#E7F5F1] border border-[#99D5C8] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#087F6C]">
                Waiting at reception ({arrivedCount})
              </h2>
              <p className="text-[11px] text-[#66706B] mt-0.5">
                Students have arrived. Verify ID and check them into the live queue.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {arrivedPatients.map((app) => (
              <div key={app.id} className="bg-white border border-[#99D5C8] p-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffAppointmentId(app.id);
                    setStaffScreen('S04_APPOINTMENT_DETAIL');
                  }}
                  className="text-left cursor-pointer"
                >
                  <div className="font-semibold text-sm text-[#111111]">{app.patientName}</div>
                  <div className="text-[11px] text-[#66706B]">
                    {app.id} · {app.time} · Index {app.studentIndex || '—'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => checkInPatient(app.id)}
                  className="px-3 py-1.5 bg-[#087F6C] text-white hover:bg-[#066A5A] font-semibold uppercase text-[11px] border border-[#087F6C] cursor-pointer shrink-0"
                >
                  Check In to Queue
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <span>View all ({totalBooked})</span>
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-[#111111]">{app.patientName}</h3>
                      {app.bookingType === 'WALK_IN' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#EBF8FF] text-[#2B6CB0] border border-[#BEE3F8]">
                          WALK-IN
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#66706B] font-normal">
                      {app.time} · {app.studentIndex ? `Index: ${app.studentIndex}` : app.phone}
                    </span>
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

        {/* Right Col: Consultation Rooms Active Snapshot */}
        <div className="space-y-4">
          <div className="bg-white border border-[#D8DCD9] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E6] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Active Consultation Rooms
              </span>
              <span className="px-2 py-0.5 bg-[#E7F5F1] text-[#087F6C] text-[10px] font-semibold uppercase">
                2 Active
              </span>
            </div>

            {/* Room 1 */}
            <div className="p-3 bg-[#F7F8F7] border border-[#D8DCD9] mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F6C]">
                  Room 1
                </span>
                <span className="text-[10px] text-[#66706B]">General OPD</span>
              </div>
              <h3 className="font-bold text-xs text-[#111111]">Dr. Kwame Boateng</h3>
              <p className="text-[11px] text-[#66706B] mt-0.5">
                {room1 ? `Serving ${room1.queueToken} · ${room1.patientName}` : 'Ready for next patient'}
              </p>
            </div>

            {/* Room 2 */}
            <div className="p-3 bg-[#F7F8F7] border border-[#D8DCD9] mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F6C]">
                  Room 2
                </span>
                <span className="text-[10px] text-[#66706B]">Reviews & OPD</span>
              </div>
              <h3 className="font-bold text-xs text-[#111111]">Dr. Ama Serwaa</h3>
              <p className="text-[11px] text-[#66706B] mt-0.5">
                {room2 ? `Serving ${room2.queueToken} · ${room2.patientName}` : 'Ready for next patient'}
              </p>
            </div>

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
