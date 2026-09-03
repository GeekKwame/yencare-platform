import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { S05EmptyQueue } from './S05EmptyQueue';

export const S05LiveQueue: React.FC = () => {
  const {
    appointments,
    callPatient,
    completeVisit,
    setStaffScreen,
    setSelectedStaffAppointmentId,
  } = useClinic();

  // Find currently called patient (if any)
  const currentlyCalled = appointments.find((a) => a.status === 'CALLED');

  // Find all waiting patients (in queue order)
  const waitingPatients = appointments.filter((a) => a.status === 'WAITING');

  // If no one is called and no one is waiting, render canonical S05 Empty Queue state
  if (!currentlyCalled && waitingPatients.length === 0) {
    return <S05EmptyQueue />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#D8DCD9] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
            Clinical Workstation
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
            Live Queue Management
          </h1>
          <p className="text-xs font-normal text-[#66706B] mt-0.5">
            General Clinic · Dr. Kwame Boateng · Consultation Room 3
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-[#FEF7ED] border border-[#FCD34D] text-[#B7791F] text-xs font-semibold">
            {waitingPatients.length} Waiting in Corridor
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStaffScreen('S03_APPOINTMENTS')}
            icon="calendar_month"
          >
            All Appointments
          </Button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Currently Called Patient (Hero Object)        */}
        {/* ========================================================= */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#D8DCD9] p-5 sticky top-6 space-y-4 shadow-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#66706B] border-b border-[#E5E7E6] pb-2 flex items-center justify-between">
              <span>Currently in Room 3</span>
              {currentlyCalled && (
                <span className="w-2 h-2 rounded-full bg-[#087F6C] animate-pulse"></span>
              )}
            </div>

            {currentlyCalled ? (
              <div className="space-y-4">
                <div className="bg-[#E7F5F1]/40 border-2 border-[#087F6C] p-6 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#087F6C] mb-1">
                    Active Queue Token
                  </div>
                  <div className="font-bold text-5xl md:text-6xl font-mono text-[#111111] my-2 select-all">
                    {currentlyCalled.queueToken || '#4'}
                  </div>
                  <h3 className="text-lg font-bold text-[#111111]">
                    {currentlyCalled.patientName}
                  </h3>
                  <div className="font-reference text-xs font-semibold text-[#66706B] mt-1">
                    Ref: {currentlyCalled.id}
                  </div>
                  <div className="text-xs font-semibold text-[#087F6C] mt-3 pt-2.5 border-t border-[#99D5C8]/60">
                    {currentlyCalled.room || 'Consultation Room 3'}
                  </div>
                </div>

                {/* Primary Action: Complete Visit */}
                <Button
                  variant="accent"
                  size="lg"
                  fullWidth
                  icon="check_circle"
                  onClick={() => completeVisit(currentlyCalled.id)}
                >
                  Complete Visit
                </Button>
              </div>
            ) : (
              <div className="bg-[#F7F8F7] border border-dashed border-[#D8DCD9] p-8 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-[#8A948F]">
                  meeting_room
                </span>
                <h3 className="text-sm font-semibold text-[#111111]">
                  No Patient Currently in Room 3
                </h3>
                <p className="text-xs text-[#66706B]">
                  Call the next patient from the waiting corridor when ready.
                </p>

                {waitingPatients.length > 0 && (
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    icon="notifications_active"
                    onClick={() => callPatient(waitingPatients[0].id)}
                  >
                    Call Next ({waitingPatients[0].patientName})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Waiting List Table                           */}
        {/* ========================================================= */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#D8DCD9] shadow-xs overflow-hidden flex flex-col h-full">
            <div className="p-4 bg-[#F7F8F7] border-b border-[#D8DCD9] flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Waiting Corridor ({waitingPatients.length})
              </h2>
              <span className="text-xs text-[#66706B] font-normal">
                Ordered by Check-In Time
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F8F7] border-b border-[#E5E7E6] text-[#66706B] font-semibold uppercase tracking-wider">
                    <th className="p-3.5 w-20">Token</th>
                    <th className="p-3.5">Patient</th>
                    <th className="p-3.5 hidden sm:table-cell">Doctor</th>
                    <th className="p-3.5 text-right w-24">Est. Wait</th>
                    <th className="p-3.5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7E6] font-normal">
                  {waitingPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#66706B] font-normal">
                        No more patients waiting in the queue.
                      </td>
                    </tr>
                  ) : (
                    waitingPatients.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-[#F7F8F7] transition-colors"
                      >
                        {/* Token */}
                        <td className="p-3.5 font-mono font-bold text-sm text-[#111111]">
                          {app.queueToken || '#--'}
                        </td>

                        {/* Patient Name + Ref */}
                        <td className="p-3.5">
                          <button
                            onClick={() => {
                              setSelectedStaffAppointmentId(app.id);
                              setStaffScreen('S04_APPOINTMENT_DETAIL');
                            }}
                            className="font-semibold text-[#111111] hover:text-[#087F6C] hover:underline text-left cursor-pointer"
                          >
                            {app.patientName}
                          </button>
                          <div className="font-reference text-[10px] text-[#66706B]">
                            {app.id}
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="p-3.5 hidden sm:table-cell text-[#66706B]">
                          {app.doctor.name}
                        </td>

                        {/* Estimated Wait */}
                        <td className="p-3.5 text-right text-[#66706B] font-mono">
                          ~{app.estimatedWaitMinutes || 20}m
                        </td>

                        {/* Call Action */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => callPatient(app.id)}
                            className="px-3 py-1.5 bg-[#111111] text-white hover:bg-[#262626] font-semibold uppercase text-[11px] border border-[#111111] transition-colors cursor-pointer w-full flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">call</span>
                            <span>Call</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick footer */}
            <div className="p-3 bg-[#F7F8F7] border-t border-[#E5E7E6] flex justify-between items-center text-xs text-[#66706B]">
              <span>Next scheduled slot: 10:30 AM</span>
              <button
                onClick={() => setStaffScreen('S03_APPOINTMENTS')}
                className="font-semibold text-[#087F6C] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Check-in roster</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
