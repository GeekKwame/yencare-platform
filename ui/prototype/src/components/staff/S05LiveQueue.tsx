import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { S05EmptyQueue } from './S05EmptyQueue';
import { sortByQueueToken } from '../../lib/clinicQueue';

export const S05LiveQueue: React.FC = () => {
  const {
    appointments,
    callPatient,
    completeVisit,
    checkInPatient,
    setStaffScreen,
    setSelectedStaffAppointmentId,
  } = useClinic();

  const currentlyCalledList = appointments.filter((a) => a.status === 'CALLED');
  const waitingPatients = sortByQueueToken(appointments.filter((a) => a.status === 'WAITING'));
  const arrivedPatients = appointments.filter((a) => a.status === 'CHECKED_IN');

  // If no one is called and no one is waiting, render canonical S05 Empty Queue state
  if (currentlyCalledList.length === 0 && waitingPatients.length === 0 && arrivedPatients.length === 0) {
    return <S05EmptyQueue />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#D8DCD9] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
            Clinical Workstation · KNUST Students' Clinic
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
            Live Virtual Queue Board
          </h1>
          <p className="text-xs font-normal text-[#66706B] mt-0.5">
            Active Consultations: Room 1 (Dr. Kwame Boateng) & Room 2 (Dr. Ama Serwaa)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStaffScreen('S06_WALK_IN')}
            icon="person_add"
          >
            + Add Walk-In
          </Button>
          <span className="px-3 py-1.5 bg-[#FEF7ED] border border-[#FCD34D] text-[#B7791F] text-xs font-semibold">
            {waitingPatients.length} Waiting
          </span>
          {arrivedPatients.length > 0 && (
            <span className="px-3 py-1.5 bg-[#E7F5F1] border border-[#99D5C8] text-[#087F6C] text-xs font-semibold">
              {arrivedPatients.length} At desk
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStaffScreen('S03_APPOINTMENTS')}
            icon="calendar_month"
          >
            Roster
          </Button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Active Consultations (Rooms 1 & 2)            */}
        {/* ========================================================= */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-[#D8DCD9] p-4 shadow-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#66706B] border-b border-[#E5E7E6] pb-2 mb-3 flex items-center justify-between">
              <span>Active Consultations</span>
              <span className="flex items-center gap-1.5 text-[#087F6C] text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#087F6C] animate-pulse"></span>
                LIVE
              </span>
            </div>

            {currentlyCalledList.length > 0 ? (
              <div className="space-y-3">
                {currentlyCalledList.map((called) => (
                  <div key={called.id} className="bg-[#E7F5F1]/40 border-2 border-[#087F6C] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 bg-[#087F6C] text-white text-[10px] font-bold uppercase tracking-wider">
                        {called.assignedRoom || 'Room 1'}
                      </span>
                      {called.bookingType === 'WALK_IN' ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#EBF8FF] text-[#2B6CB0] border border-[#BEE3F8]">
                          WALK-IN
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#F0F2F1] text-[#66706B]">
                          BOOKED
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-4xl font-mono text-[#111111] my-1">
                      {called.queueToken || '#4'}
                    </div>
                    <h3 className="text-base font-bold text-[#111111]">
                      {called.patientName}
                    </h3>
                    <div className="font-reference text-xs font-semibold text-[#66706B] mt-0.5">
                      Ref: {called.id} {called.studentIndex ? `· Idx: ${called.studentIndex}` : ''}
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#99D5C8]/60">
                      <Button
                        variant="accent"
                        size="sm"
                        fullWidth
                        icon="check_circle"
                        onClick={() => completeVisit(called.id)}
                      >
                        Complete Visit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#F7F8F7] border border-dashed border-[#D8DCD9] p-6 text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#8A948F]">
                  meeting_room
                </span>
                <h3 className="text-xs font-semibold text-[#111111]">
                  Both Rooms Ready
                </h3>
                <p className="text-[11px] text-[#66706B]">
                  Rooms 1 & 2 are open. Call the next patient when ready.
                </p>
              </div>
            )}
          </div>

          {/* Quick Call Next widget */}
          {waitingPatients.length > 0 && (
            <div className="bg-white border border-[#D8DCD9] p-4 shadow-xs space-y-2.5">
              <div className="text-xs font-bold text-[#111111]">
                Call Next Patient ({waitingPatients[0].patientName})
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon="call"
                  onClick={() => callPatient(waitingPatients[0].id, 'Room 1')}
                >
                  &rarr; Room 1
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon="call"
                  onClick={() => callPatient(waitingPatients[0].id, 'Room 2')}
                >
                  &rarr; Room 2
                </Button>
              </div>
            </div>
          )}

          {arrivedPatients.length > 0 && (
            <div className="bg-[#E7F5F1] border border-[#99D5C8] p-4 shadow-xs space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#087F6C]">
                Arrived — not yet queued
              </div>
              {arrivedPatients.map((app) => (
                <div key={app.id} className="bg-white border border-[#99D5C8] p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffAppointmentId(app.id);
                      setStaffScreen('S04_APPOINTMENT_DETAIL');
                    }}
                    className="text-left cursor-pointer"
                  >
                    <div className="font-semibold text-xs text-[#111111]">{app.patientName}</div>
                    <div className="text-[10px] text-[#66706B]">{app.id} · {app.time}</div>
                  </button>
                  <Button
                    variant="accent"
                    size="sm"
                    fullWidth
                    icon="how_to_reg"
                    onClick={() => checkInPatient(app.id)}
                  >
                    Check In to Queue
                  </Button>
                </div>
              ))}
            </div>
          )}
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
                Virtual & Physical Waiting Line
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F8F7] border-b border-[#E5E7E6] text-[#66706B] font-semibold uppercase tracking-wider">
                    <th className="p-3.5 w-16">Token</th>
                    <th className="p-3.5">Student / Patient</th>
                    <th className="p-3.5 hidden sm:table-cell">Type</th>
                    <th className="p-3.5 text-right w-20">Est. Wait</th>
                    <th className="p-3.5 text-center w-36">Call Patient</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7E6] font-normal">
                  {waitingPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#66706B] font-normal">
                        No students currently waiting in the queue.
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
                            {app.id} {app.studentIndex ? `· ${app.studentIndex}` : ''}
                          </div>
                        </td>

                        {/* Type (Booked vs Walk-in) */}
                        <td className="p-3.5 hidden sm:table-cell">
                          {app.bookingType === 'WALK_IN' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#EBF8FF] text-[#2B6CB0] border border-[#BEE3F8]">
                              WALK-IN
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-[#66706B]">
                              Booked
                            </span>
                          )}
                        </td>

                        {/* Estimated Wait */}
                        <td className="p-3.5 text-right text-[#66706B] font-mono">
                          ~{app.estimatedWaitMinutes || 15}m
                        </td>

                        {/* Call Action with Room Selection */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => callPatient(app.id, 'Room 1')}
                              className="px-2 py-1 bg-[#111111] text-white hover:bg-[#262626] font-semibold uppercase text-[10px] border border-[#111111] transition-colors cursor-pointer"
                              title="Call to Room 1"
                            >
                              Rm 1
                            </button>
                            <button
                              onClick={() => callPatient(app.id, 'Room 2')}
                              className="px-2 py-1 bg-[#087F6C] text-white hover:bg-[#066A5A] font-semibold uppercase text-[10px] border border-[#087F6C] transition-colors cursor-pointer"
                              title="Call to Room 2"
                            >
                              Rm 2
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick footer */}
            <div className="p-3 bg-[#F7F8F7] border-t border-[#E5E7E6] flex justify-between items-center text-xs text-[#66706B]">
              <span>YɛnCare queue · KNUST Students' Clinic</span>
              <button
                onClick={() => setStaffScreen('S03_APPOINTMENTS')}
                className="font-semibold text-[#087F6C] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Full Roster</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
