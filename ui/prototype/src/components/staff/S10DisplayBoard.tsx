import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ClinicSite, CLINIC_SITE_LABELS } from '../../types/clinic';
import { sortByQueueToken } from '../../lib/clinicQueue';
import { useAccraClock } from '../../lib/accraTime';

export const S10DisplayBoard: React.FC = () => {
  const { appointments, setStaffScreen } = useClinic();
  const { time, isOpen } = useAccraClock();
  const [site, setSite] = useState<ClinicSite>('students-clinic');

  const siteApps = appointments.filter((a) => a.clinicSite === site);
  const room1 = siteApps.find(
    (a) => a.status === 'CALLED' && (a.assignedRoom === 'Room 1' || (!a.assignedRoom && a.doctor.room === 'Room 1'))
  );
  const room2 = siteApps.find(
    (a) => a.status === 'CALLED' && (a.assignedRoom === 'Room 2' || (!a.assignedRoom && a.doctor.room === 'Room 2'))
  );
  const waiting = sortByQueueToken(siteApps.filter((a) => a.status === 'WAITING'));
  const siteLabel = CLINIC_SITE_LABELS[site].name;

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col px-4 py-4 md:px-8 md:py-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#087F6C] text-white flex items-center justify-center font-bold text-lg">
            Y
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">YɛnCare</div>
            <div className="text-[11px] uppercase tracking-wider text-[#8A948F]">
              KNUST {siteLabel} · Corridor display
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-[#1A1A1A] border border-[#333333] p-0.5">
            <button
              type="button"
              onClick={() => setSite('students-clinic')}
              className={`px-3 py-1.5 text-[11px] font-semibold cursor-pointer ${
                site === 'students-clinic' ? 'bg-white text-black' : 'text-[#8A948F] hover:text-white'
              }`}
            >
              Students' Clinic
            </button>
            <button
              type="button"
              onClick={() => setSite('social-science-gf7')}
              className={`px-3 py-1.5 text-[11px] font-semibold cursor-pointer ${
                site === 'social-science-gf7' ? 'bg-white text-black' : 'text-[#8A948F] hover:text-white'
              }`}
            >
              Social Science GF7
            </button>
          </div>
          <div className="px-3 py-1.5 font-mono text-lg tabular-nums">{time}</div>
          <span
            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
              isOpen ? 'bg-[#087F6C] text-white' : 'bg-[#9B2C2C] text-white'
            }`}
          >
            {isOpen ? 'Open' : 'Closed'}
          </span>
          <button
            type="button"
            onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
            className="px-3 py-1.5 text-[11px] font-semibold border border-[#333333] text-[#8A948F] hover:text-white hover:border-white cursor-pointer"
          >
            Exit display
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 py-6">
        <NowServingCard
          room="Room 1"
          doctor="Dr. Kwame Boateng"
          token={room1?.queueToken}
          serving={Boolean(room1)}
        />
        {site === 'students-clinic' ? (
          <NowServingCard
            room="Room 2"
            doctor="Dr. Ama Serwaa"
            token={room2?.queueToken}
            serving={Boolean(room2)}
          />
        ) : (
          <div className="border border-[#2A2A2A] bg-[#161616] p-6 flex items-center justify-center text-[#8A948F] text-sm">
            Single consultation room at this site
          </div>
        )}
      </div>

      <footer className="border-t border-[#2A2A2A] pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A948F]">
            Waiting corridor · tokens only
          </div>
          <div className="text-xs text-[#8A948F]">{waiting.length} in line</div>
        </div>
        {waiting.length === 0 ? (
          <p className="text-sm text-[#66706B]">No students currently waiting.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {waiting.map((app, idx) => (
              <div
                key={app.id}
                className={`px-4 py-2 font-mono font-bold text-lg border ${
                  idx === 0
                    ? 'bg-[#087F6C] border-[#087F6C] text-white'
                    : 'bg-[#1A1A1A] border-[#333333] text-white'
                }`}
              >
                {app.queueToken}
                {idx === 0 && (
                  <span className="ml-2 text-[10px] font-sans font-semibold uppercase tracking-wider">
                    Next
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-[#66706B] mt-4">
          Student names are not shown on this public board. Listen for your token, or watch YɛnCare on your phone.
        </p>
      </footer>
    </div>
  );
};

const NowServingCard: React.FC<{
  room: string;
  doctor: string;
  token?: string;
  serving: boolean;
}> = ({ room, doctor, token, serving }) => (
  <div
    className={`border p-6 md:p-10 flex flex-col justify-between min-h-[280px] ${
      serving ? 'border-[#087F6C] bg-[#087F6C]/10 call-flash' : 'border-[#2A2A2A] bg-[#161616]'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-widest text-[#8A948F]">{room}</span>
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#087F6C]">
        <span className="w-2 h-2 rounded-full bg-[#087F6C] animate-pulse"></span>
        Live
      </span>
    </div>
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[#8A948F] mb-2">Now serving</div>
      <div className="font-mono font-bold tracking-tight text-7xl md:text-8xl leading-none">
        {token || '—'}
      </div>
    </div>
    <div className="text-sm text-[#CCCCCC]">
      {serving ? doctor : `${doctor} · Ready for next`}
    </div>
  </div>
);
