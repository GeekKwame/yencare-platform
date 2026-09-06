import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { VISIT_TYPE_LABELS } from '../../types/clinic';

export const S03Appointments: React.FC = () => {
  const { appointments, checkInPatient, setStaffScreen, setSelectedStaffAppointmentId } = useClinic();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredAppointments = appointments.filter((app) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      app.patientName.toLowerCase().includes(term) ||
      app.id.toLowerCase().includes(term) ||
      app.phone.includes(term) ||
      (app.studentIndex && app.studentIndex.toLowerCase().includes(term));
    
    let matchesFilter = true;
    if (filterStatus === 'ALL') {
      matchesFilter = true;
    } else if (filterStatus === 'WALK_IN') {
      matchesFilter = app.bookingType === 'WALK_IN';
    } else {
      matchesFilter = app.status === filterStatus;
    }

    return matchesSearch && matchesFilter;
  });

  const filterTabs = [
    { label: 'All', value: 'ALL', count: appointments.length },
    { label: 'Booked', value: 'BOOKED', count: appointments.filter((a) => a.status === 'BOOKED').length },
    { label: 'Waiting', value: 'WAITING', count: appointments.filter((a) => a.status === 'WAITING').length },
    { label: 'Walk-Ins', value: 'WALK_IN', count: appointments.filter((a) => a.bookingType === 'WALK_IN').length },
    { label: 'No-Shows', value: 'NO_SHOW', count: appointments.filter((a) => a.status === 'NO_SHOW').length },
    { label: 'Completed', value: 'COMPLETED', count: appointments.filter((a) => a.status === 'COMPLETED').length },
    { label: 'Cancelled', value: 'CANCELLED', count: appointments.filter((a) => a.status === 'CANCELLED').length },
  ];

  const handleOpenDetail = (id: string) => {
    setSelectedStaffAppointmentId(id);
    setStaffScreen('S04_APPOINTMENT_DETAIL');
  };

  const handleOpenNoShow = (id: string) => {
    setSelectedStaffAppointmentId(id);
    setStaffScreen('S09_NO_SHOW_CONFIRM');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#D8DCD9] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
            Clinical Roster
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
            Appointments Roster
          </h1>
          <p className="text-xs font-normal text-[#66706B] mt-0.5">
            Tuesday 15 September 2026 · KNUST Students' Clinic
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
            onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
            icon="reorder"
          >
            Live Queue &rarr;
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#D8DCD9] p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8A948F] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, index number (e.g. 20612345), phone, or reference..."
              className="w-full pl-9 pr-3 py-2 text-xs font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none transition-all"
            />
          </div>

          {/* Quick Clear */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-1.5 text-xs font-semibold border border-[#D8DCD9] text-[#111111] hover:bg-[#F0F2F1] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#E5E7E6]">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1 text-xs font-semibold tracking-wide border transition-all cursor-pointer ${
                filterStatus === tab.value
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-[#F7F8F7] text-[#66706B] border-[#D8DCD9] hover:border-[#111111]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-[#D8DCD9] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F8F7] border-b border-[#D8DCD9] text-[#66706B] font-semibold uppercase tracking-wider">
                <th className="p-3.5">Ref</th>
                <th className="p-3.5">Student / Patient</th>
                <th className="p-3.5 hidden sm:table-cell">Visit Type</th>
                <th className="p-3.5">Slot Time</th>
                <th className="p-3.5 hidden md:table-cell">Doctor / Room</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7E6] font-normal text-[#111111]">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#66706B] font-normal">
                    No appointments match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-[#F7F8F7] transition-colors"
                  >
                    {/* Ref */}
                    <td className="p-3.5">
                      <button
                        onClick={() => handleOpenDetail(app.id)}
                        className="font-reference font-semibold text-xs bg-[#F0F2F1] hover:bg-[#111111] hover:text-white border border-[#D8DCD9] px-2 py-1 transition-colors cursor-pointer"
                      >
                        {app.id}
                      </button>
                    </td>

                    {/* Patient Name + Index + Badge */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(app.id)}
                          className="font-semibold text-[#111111] hover:text-[#087F6C] hover:underline text-left block cursor-pointer"
                        >
                          {app.patientName}
                        </button>
                        {app.bookingType === 'WALK_IN' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#EBF8FF] text-[#2B6CB0] border border-[#BEE3F8]">
                            WALK-IN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#66706B]">
                        {app.studentIndex ? `Index: ${app.studentIndex}` : app.phone}
                      </div>
                    </td>

                    {/* Visit Type */}
                    <td className="p-3.5 hidden sm:table-cell text-[#66706B]">
                      {app.visitType ? VISIT_TYPE_LABELS[app.visitType] : 'General OPD'}
                    </td>

                    {/* Time */}
                    <td className="p-3.5 font-medium">
                      {app.time}
                      {app.staffChangedTime && (
                        <span className="block text-[9px] text-[#2B6CB0] font-bold">
                          UPDATED
                        </span>
                      )}
                    </td>

                    {/* Doctor / Room */}
                    <td className="p-3.5 hidden md:table-cell text-[#66706B]">
                      <div className="font-medium text-[#111111]">{app.doctor.name}</div>
                      <div className="text-[10px]">{app.assignedRoom || app.doctor.room}</div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <StatusBadge status={app.status} token={app.queueToken} size="sm" />
                    </td>

                    {/* Inline Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {app.status === 'BOOKED' && (
                          <>
                            <button
                              onClick={() => checkInPatient(app.id)}
                              className="px-2.5 py-1 bg-[#087F6C] text-white hover:bg-[#066A5A] font-semibold uppercase text-[11px] border border-[#087F6C] transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                              title="Check in patient"
                            >
                              <span className="material-symbols-outlined text-[13px]">check</span>
                              <span>Check In</span>
                            </button>
                            <button
                              onClick={() => handleOpenNoShow(app.id)}
                              className="px-2 py-1 text-[#9B2C2C] hover:bg-[#FFF5F5] font-semibold text-[11px] border border-[#FEB2B2] transition-colors cursor-pointer"
                              title="Mark as No-Show"
                            >
                              No-Show
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleOpenDetail(app.id)}
                          className="px-2 py-1 text-[#66706B] hover:text-[#111111] font-semibold text-[11px] border border-[#D8DCD9] hover:border-[#111111] hover:bg-[#F0F2F1] transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
