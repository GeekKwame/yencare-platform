import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

export const S03Appointments: React.FC = () => {
  const { appointments, checkInPatient, setStaffScreen, setSelectedStaffAppointmentId } = useClinic();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredAppointments = appointments.filter((app) => {
    const matchesSearch = 
      app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.includes(searchTerm);
    
    const matchesFilter = 
      filterStatus === 'ALL' ? true : app.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const filterTabs = [
    { label: 'All', value: 'ALL', count: appointments.length },
    { label: 'Booked', value: 'BOOKED', count: appointments.filter((a) => a.status === 'BOOKED').length },
    { label: 'Waiting', value: 'WAITING', count: appointments.filter((a) => a.status === 'WAITING').length },
    { label: 'Completed', value: 'COMPLETED', count: appointments.filter((a) => a.status === 'COMPLETED').length },
    { label: 'Cancelled', value: 'CANCELLED', count: appointments.filter((a) => a.status === 'CANCELLED').length },
  ];

  const handleOpenDetail = (id: string) => {
    setSelectedStaffAppointmentId(id);
    setStaffScreen('S04_APPOINTMENT_DETAIL');
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
            Tuesday 15 September 2026 · General Clinic · Dr. Kwame Boateng
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
          icon="reorder"
        >
          View Live Queue &rarr;
        </Button>
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
              placeholder="Search by patient name, phone, or reference (e.g. Ama Mensah or YC-4821)..."
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
                <th className="p-3.5">Patient Name</th>
                <th className="p-3.5 hidden sm:table-cell">Phone</th>
                <th className="p-3.5">Slot Time</th>
                <th className="p-3.5 hidden md:table-cell">Doctor</th>
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

                    {/* Patient Name */}
                    <td className="p-3.5">
                      <button
                        onClick={() => handleOpenDetail(app.id)}
                        className="font-semibold text-[#111111] hover:text-[#087F6C] hover:underline text-left block cursor-pointer"
                      >
                        {app.patientName}
                      </button>
                    </td>

                    {/* Phone */}
                    <td className="p-3.5 hidden sm:table-cell font-mono text-[#66706B]">
                      {app.phone}
                    </td>

                    {/* Time */}
                    <td className="p-3.5 font-medium">
                      {app.time}
                    </td>

                    {/* Doctor */}
                    <td className="p-3.5 hidden md:table-cell text-[#66706B]">
                      {app.doctor.name}
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <StatusBadge status={app.status} token={app.queueToken} size="sm" />
                    </td>

                    {/* Inline Action - Distinct CHECK IN action button */}
                    <td className="p-3.5 text-right">
                      {app.status === 'BOOKED' ? (
                        <button
                          onClick={() => checkInPatient(app.id)}
                          className="px-3 py-1.5 bg-[#087F6C] text-white hover:bg-[#066A5A] font-semibold uppercase text-[11px] border border-[#087F6C] transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">check</span>
                          <span>Check In</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenDetail(app.id)}
                          className="px-2.5 py-1 text-[#66706B] hover:text-[#111111] font-semibold text-[11px] border border-[#D8DCD9] hover:border-[#111111] hover:bg-[#F0F2F1] transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      )}
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
