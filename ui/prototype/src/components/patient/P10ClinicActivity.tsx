import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ClinicSite, CLINIC_SITE_LABELS } from '../../types/clinic';
import { getArriveBy } from '../../lib/clinicQueue';

export const P10ClinicActivity: React.FC = () => {
  const { 
    currentPatientAppointment,
    setPatientScreen, 
    getClinicActivity, 
    arrivePatient,
    clinicActivityOverride,
    setClinicActivityOverride,
  } = useClinic();

  const appointment = currentPatientAppointment;
  const initialSite: ClinicSite = appointment?.clinicSite || 'students-clinic';
  const [selectedSite, setSelectedSite] = useState<ClinicSite>(initialSite);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justArrived, setJustArrived] = useState(false);

  const activity = getClinicActivity(selectedSite);
  const isUserBookedHere = appointment && appointment.clinicSite === selectedSite;
  const isBookedUnchecked = appointment && appointment.status === 'BOOKED';
  const isArrivedAwaitingDesk = appointment && appointment.status === 'CHECKED_IN';
  const isInLiveQueue = appointment && (appointment.status === 'WAITING' || appointment.status === 'CALLED');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleArrive = () => {
    if (!appointment) return;
    setJustArrived(true);
    setTimeout(() => {
      arrivePatient(appointment.id);
    }, 600);
  };

  // Wait time formatting
  const estWaitText = activity.estimatedWaitMinutes === 0
    ? 'No wait'
    : activity.estimatedWaitMinutes >= 35 
      ? '30–40 min' 
      : `${activity.estimatedWaitMinutes - 5}–${activity.estimatedWaitMinutes + 5} min`;

  return (
    <div className="w-full flex-1 flex flex-col items-center py-6 md:py-10 px-4 font-sans">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5 md:p-7 space-y-5">
        
        {/* Top Header & Back Navigation */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5">
          <button
            onClick={() => {
              if (appointment) {
                setPatientScreen('P11_DETAILS');
              } else {
                setPatientScreen('P01_HOME');
              }
            }}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>{appointment ? 'My Appointment' : 'Home'}</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Live Clinic Activity
            </h1>
            <p className="text-[10px] text-[#66706B]">Pre-Check-In Facility Status</p>
          </div>

          <button 
            onClick={handleRefresh}
            className={`text-[#66706B] hover:text-[#111111] p-1 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh queue activity"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>

        {/* Live Facility Pulse Banner */}
        <div className="flex items-center justify-between bg-[#F7F8F7] border border-[#D8DCD9] p-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                !activity.isOpen ? 'bg-red-400' : 'bg-[#087F6C]'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                !activity.isOpen ? 'bg-red-500' : 'bg-[#087F6C]'
              }`}></span>
            </span>
            <span className="font-semibold text-[#111111]">
              {!activity.isOpen 
                ? 'Clinic Closed' 
                : activity.demandLevel === 'high' 
                  ? 'Open · High Clinic Load' 
                  : 'Open · Normal Flow'}
            </span>
          </div>
          <span className="text-[11px] text-[#66706B]">
            Updated {activity.lastUpdated}
          </span>
        </div>

        {/* Clinic Site Selector (Multi-location) */}
        <div className="border border-[#D8DCD9] bg-[#F7F8F7] p-1 flex gap-1 text-xs">
          <button
            onClick={() => setSelectedSite('students-clinic')}
            className={`flex-1 py-2 px-3 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedSite === 'students-clinic'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'text-[#66706B] hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">apartment</span>
            <span>Students' Clinic</span>
          </button>
          <button
            onClick={() => setSelectedSite('social-science-gf7')}
            className={`flex-1 py-2 px-3 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedSite === 'social-science-gf7'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'text-[#66706B] hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            <span>Social Science GF7</span>
          </button>
        </div>

        {/* Edge Case Warning Overrides */}
        {clinicActivityOverride === 'unavailable' && (
          <div className="bg-[#FEF7ED] border border-[#FCD34D] p-3.5 text-xs text-[#78350F] space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[#B7791F] text-[18px]">warning</span>
              <span>Live queue sync temporarily unavailable</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#92400E]">
              We could not connect to the clinic queue server. Reception check-in at the desk is proceeding manually as normal.
            </p>
            <button 
              onClick={() => setClinicActivityOverride('normal')}
              className="text-[11px] font-bold underline text-[#78350F] hover:text-black cursor-pointer"
            >
              Retry live connection
            </button>
          </div>
        )}

        {clinicActivityOverride === 'high-demand' && (
          <div className="bg-red-50 border border-red-300 p-3.5 text-xs text-red-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">priority_high</span>
            <div>
              <strong className="block font-bold text-red-900">High clinic surge today</strong>
              <p className="text-[11px] text-red-800 leading-relaxed mt-0.5">
                Walk-in triage and consultation times are running longer than usual. Please arrive strictly 15 minutes before your scheduled slot.
              </p>
            </div>
          </div>
        )}

        {/* CRITICAL RULE: Distinct "Your Booking" Card */}
        {isUserBookedHere && appointment && (
          <div className="bg-white border-2 border-[#087F6C] p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#087F6C] text-white text-[10px] font-bold uppercase px-3 py-1 tracking-wider">
              Your Booking
            </div>

            <div className="mb-2">
              <span className="text-[10px] font-semibold text-[#66706B] uppercase tracking-wider block">
                Reference Code
              </span>
              <span className="text-2xl font-mono font-bold text-[#111111]">
                {appointment.id}
              </span>
            </div>

            <div className="mb-3">
              {isBookedUnchecked ? (
                <div className="inline-flex items-center gap-1.5 bg-[#FEF7ED] border border-[#FCD34D] text-[#B7791F] text-xs font-bold px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-[#B7791F]"></span>
                  BOOKED · NOT ARRIVED
                </div>
              ) : isArrivedAwaitingDesk ? (
                <div className="inline-flex items-center gap-1.5 bg-[#E7F5F1] border border-[#99D5C8] text-[#087F6C] text-xs font-bold px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-[#087F6C]"></span>
                  ARRIVED · AWAITING RECEPTION
                </div>
              ) : isInLiveQueue ? (
                <div className="inline-flex items-center gap-1.5 bg-[#E7F5F1] border border-[#99D5C8] text-[#087F6C] text-xs font-bold px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-[#087F6C]"></span>
                  IN QUEUE · {appointment.queueToken || '—'}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-[#F0F2F1] text-[#3D4541] text-xs font-bold px-2.5 py-1 border border-[#D8DCD9]">
                  {appointment.status}
                </div>
              )}
            </div>

            {isBookedUnchecked && (
              <div className="bg-[#F7F8F7] border border-[#E5E7E6] p-3 mb-3 text-xs text-[#3D4541] space-y-1">
                <p className="font-semibold text-[#111111] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#087F6C]">schedule</span>
                  <span>Scheduled for {appointment.time} today</span>
                </p>
                <p className="text-[11px] text-[#66706B] leading-relaxed">
                  Tell YɛnCare when you arrive. Reception then verifies your ID and assigns your live queue token.
                </p>
              </div>
            )}

            {isArrivedAwaitingDesk && (
              <div className="bg-[#E7F5F1] border border-[#99D5C8] p-3 mb-3 text-xs text-[#066A5A] space-y-1">
                <p className="font-semibold text-[#087F6C] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                  <span>Reception has been notified</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Present {appointment.id} at the desk. Staff will check you into the live queue and your token will appear here.
                </p>
              </div>
            )}

            {justArrived ? (
              <div className="bg-[#E7F5F1] border border-[#99D5C8] p-3 text-xs text-[#087F6C] font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Arrival recorded. Directing to queue status...</span>
              </div>
            ) : isBookedUnchecked ? (
              <div className="pt-2.5 border-t border-[#E5E7E6] flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-[#111111] block">At the clinic now?</span>
                  <span className="text-[11px] text-[#66706B]">Let reception know you have arrived</span>
                </div>
                <button
                  onClick={handleArrive}
                  className="bg-[#087F6C] hover:bg-[#066354] text-white font-bold text-xs px-3.5 py-2 transition-colors flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  <span>I've arrived</span>
                </button>
              </div>
            ) : isInLiveQueue ? (
              <div className="pt-2.5 border-t border-[#E5E7E6] flex items-center justify-between">
                <span className="text-xs font-medium text-[#087F6C]">You are in the live queue</span>
                <button
                  onClick={() => setPatientScreen('P18_QUEUE')}
                  className="text-xs font-bold text-[#087F6C] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View My Queue Status</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-[#E5E7E6] flex items-center justify-between">
                <span className="text-xs font-medium text-[#087F6C]">Waiting for reception check-in</span>
                <button
                  onClick={() => setPatientScreen('P18_QUEUE')}
                  className="text-xs font-bold text-[#087F6C] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View status</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hero Section: Now Serving */}
        <div className="border border-[#D8DCD9] p-5 bg-[#F7F8F7]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E6] mb-4">
            <span className="text-xs font-bold tracking-wider uppercase text-[#66706B] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#087F6C]">pulse_alert</span>
              <span>Now Serving</span>
            </span>
            <span className="text-[11px] font-semibold text-[#087F6C] bg-[#E7F5F1] px-2 py-0.5 border border-[#99D5C8]">
              Live Facility Status
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-4xl font-extrabold tracking-tight text-[#111111] font-mono">
                {activity.nowServingToken || 'None'}
              </div>
              <p className="text-xs text-[#66706B] mt-1 font-medium">
                {activity.nowServingToken ? 'In consultation session' : 'No patients currently in consultation'}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-white border border-[#D8DCD9] text-[#111111] font-bold text-xs px-2.5 py-1.5 shadow-2xs">
                {activity.nowServingRoom || 'Consulting Room'}
              </div>
              <p className="text-[11px] text-[#66706B] mt-1 font-medium">
                {CLINIC_SITE_LABELS[selectedSite]?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#D8DCD9] p-4 text-left">
            <div className="flex items-center gap-1.5 text-[#66706B] text-xs font-semibold mb-1">
              <span className="material-symbols-outlined text-[16px] text-blue-600">group</span>
              <span>Waiting in Clinic</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#111111]">
              {activity.waitingCount} <span className="text-xs font-normal text-[#66706B] font-sans">patients</span>
            </div>
            <p className="text-[11px] text-[#66706B] mt-0.5">Checked in at reception</p>
          </div>

          <div className="bg-white border border-[#D8DCD9] p-4 text-left">
            <div className="flex items-center gap-1.5 text-[#66706B] text-xs font-semibold mb-1">
              <span className="material-symbols-outlined text-[16px] text-[#B7791F]">schedule</span>
              <span>Est. Clinic Wait</span>
            </div>
            <div className="text-2xl font-bold text-[#111111]">
              {estWaitText}
            </div>
            <p className="text-[11px] text-[#66706B] mt-0.5">Subject to triage priority</p>
          </div>
        </div>

        {/* Privacy-Safe Waiting Queue Corridor */}
        <div className="border border-[#D8DCD9] p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Waiting Queue Corridor
              </h2>
              <p className="text-[11px] text-[#66706B]">Tokens currently checked in and waiting</p>
            </div>
            <span className="text-xs font-semibold text-[#66706B] bg-[#F0F2F1] px-2 py-0.5 border border-[#D8DCD9]">
              {activity.waitingCount} in line
            </span>
          </div>

          {activity.waitingTokens.length === 0 ? (
            <div className="py-6 text-center text-[#66706B] text-xs bg-[#F7F8F7] border border-dashed border-[#D8DCD9]">
              No patients currently waiting in the corridor. Walk-ins can be seen promptly.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {activity.waitingTokens.map((token, idx) => (
                <div 
                  key={token + idx}
                  className="flex items-center gap-1.5 bg-[#F7F8F7] border border-[#D8DCD9] px-3 py-1.5 text-xs font-mono font-bold text-[#111111]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span>{token}</span>
                  {idx === 0 && (
                    <span className="text-[10px] text-blue-700 font-sans font-semibold ml-1">
                      (Next)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-[#E5E7E6] flex items-center justify-between text-[11px] text-[#66706B]">
            <span className="flex items-center gap-1 text-[#087F6C] font-semibold">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              <span>Student identities protected</span>
            </span>
            <span>Only token numbers shown</span>
          </div>
        </div>

        {/* Active Consultation Rooms */}
        <div className="border border-[#D8DCD9] p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#087F6C]">meeting_room</span>
              <span>Active Consultation Rooms</span>
            </h2>
            <span className="text-xs font-medium text-[#66706B]">
              {activity.activeRooms.length} Operating
            </span>
          </div>

          <div className="space-y-2.5">
            {activity.activeRooms.length === 0 ? (
              <p className="text-xs text-[#66706B] py-2 text-center">No active consultation rooms currently reported.</p>
            ) : (
              activity.activeRooms.map((room) => (
                <div 
                  key={room.room}
                  className="flex items-center justify-between p-3 border border-[#E5E7E6] bg-[#F7F8F7]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#111111]">{room.room}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 ${
                        room.status === 'in-consultation' 
                          ? 'bg-[#E7F5F1] text-[#087F6C] border border-[#99D5C8]' 
                          : 'bg-[#F0F2F1] text-[#66706B] border border-[#D8DCD9]'
                      }`}>
                        {room.status === 'in-consultation' ? 'In Consultation' : 'Available'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#66706B] mt-0.5">
                      {room.doctorName} {room.specialty ? `· ${room.specialty}` : ''}
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    {room.currentToken ? (
                      <span className="text-xs font-bold text-[#111111] bg-white border border-[#D8DCD9] px-2 py-1 shadow-2xs">
                        Serving {room.currentToken}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#8A948F] font-sans">Ready for next</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Arrival Guidance Card */}
        <div className="border border-[#D8DCD9] p-4 bg-white">
          <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#087F6C]">schedule</span>
            <span>Arrival Recommendations</span>
          </h2>
          <div className="text-xs text-[#3D4541] space-y-2 leading-relaxed">
            <p className="font-semibold text-[#111111]">
              {appointment 
                ? `Your appointment is at ${appointment.time}. Arrive by ${getArriveBy(appointment.time)}.`
                : 'Plan to arrive 15 minutes before your scheduled appointment time.'}
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[#66706B] text-[11px]">
              <li>Carry your valid KNUST Student ID Card for verification at reception.</li>
              <li>Wait comfortably in nearby shaded campus areas until 15 minutes before your slot.</li>
              <li>Urgent triage emergencies take clinical precedence over scheduled appointments.</li>
            </ul>
          </div>
        </div>

        {/* Footer info & sync notice */}
        <div className="flex items-center justify-between text-[11px] text-[#8A948F] pt-2 border-t border-[#E5E7E6]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#087F6C]">sync</span>
            <span>YɛnCare · KNUST Students' Clinic queue</span>
          </span>
          <button 
            onClick={() => setClinicActivityOverride(clinicActivityOverride === 'normal' ? 'unavailable' : 'normal')}
            className="hover:underline text-[#66706B] cursor-pointer"
          >
            {clinicActivityOverride === 'normal' ? 'Test offline mode' : 'Reset sync'}
          </button>
        </div>

      </div>
    </div>
  );
};
export default P10ClinicActivity;
