import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/Yencare Logo.png";
import {
  CLINIC_SITE_LABELS,
  DEFAULT_CLINIC_SITE,
  getMockTodaysAppointments,
  mapAppointmentToCard,
  todayIsoDate,
} from "../data/mockAppointments";
import { getTodaysAppointments } from "../services/appointments";

const ROOM_DOCTORS = {
  "Room 1": "Dr. Kwame Boateng",
  "Room 2": "Dr. Ama Serwaa",
  "Consultation Room GF7": "Duty clinician",
};

function NowServingCard({ room, doctor, token, serving }) {
  return (
    <div
      className={`flex min-h-[260px] flex-col justify-between border p-6 md:p-10 ${
        serving ? "border-[#087F6C] bg-[#087F6C]/10" : "border-[#2A2A2A] bg-[#161616]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-[#8A948F]">{room}</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#087F6C]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#087F6C]" />
          Live
        </span>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[#8A948F]">{doctor}</p>
        <p className="mt-2 font-mono text-6xl font-bold tracking-tight text-white md:text-7xl">
          {serving ? token || "—" : "—"}
        </p>
        <p className="mt-2 text-sm text-[#8A948F]">{serving ? "Now serving" : "No call in this room"}</p>
      </div>
    </div>
  );
}

export default function CorridorDisplay() {
  const [clinicSite, setClinicSite] = useState(DEFAULT_CLINIC_SITE);
  const [appointments, setAppointments] = useState(() =>
    getMockTodaysAppointments(DEFAULT_CLINIC_SITE, todayIsoDate()),
  );
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getTodaysAppointments(clinicSite, todayIsoDate());
        if (cancelled) return;
        const list = Array.isArray(data) ? data.map(mapAppointmentToCard) : [];
        setAppointments(
          list.length > 0 ? list : getMockTodaysAppointments(clinicSite, todayIsoDate()),
        );
      } catch {
        if (cancelled) return;
        setAppointments(getMockTodaysAppointments(clinicSite, todayIsoDate()));
      }
    }

    load();
    const refresh = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, [clinicSite]);

  const calledByRoom = useMemo(() => {
    const map = {};
    for (const appt of appointments) {
      if (appt.status !== "CALLED") continue;
      const room = appt.roomName || "Room 1";
      map[room] = appt;
    }
    return map;
  }, [appointments]);

  const waiting = appointments
    .filter((appt) => appt.status === "WAITING")
    .sort((a, b) => String(a.queueToken || "").localeCompare(String(b.queueToken || "")));

  const room1 = calledByRoom["Room 1"];
  const room2 = calledByRoom["Room 2"];
  const gf7 = calledByRoom["Consultation Room GF7"];
  const siteLabel = CLINIC_SITE_LABELS[clinicSite] || clinicSite;

  return (
    <div className="flex min-h-screen flex-col bg-[#111111] px-4 py-4 text-white md:px-8 md:py-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[#2A2A2A] pb-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white px-3 py-2">
            <img src={Logo} alt="YɛnCare" className="h-8 w-auto object-contain" />
          </div>
          <div className="text-[11px] uppercase tracking-wider text-[#8A948F]">
            KNUST {siteLabel} · Corridor display
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-[#333333] bg-[#1A1A1A] p-0.5">
            {Object.entries(CLINIC_SITE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setClinicSite(value)}
                className={`px-3 py-1.5 text-[11px] font-semibold ${
                  clinicSite === value ? "bg-white text-black" : "text-[#8A948F] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 font-mono text-lg tabular-nums">{clock}</div>
          <Link
            to="/staff"
            className="border border-[#333333] px-3 py-1.5 text-[11px] font-semibold text-[#8A948F] hover:border-white hover:text-white"
          >
            Exit display
          </Link>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 py-6 lg:grid-cols-2 md:gap-6">
        {clinicSite === "social-science-gf7" ? (
          <>
            <NowServingCard
              room="Consultation Room GF7"
              doctor={ROOM_DOCTORS["Consultation Room GF7"]}
              token={gf7?.queueToken}
              serving={Boolean(gf7)}
            />
            <div className="flex items-center justify-center border border-[#2A2A2A] bg-[#161616] p-6 text-sm text-[#8A948F]">
              Single consultation room at this site
            </div>
          </>
        ) : (
          <>
            <NowServingCard
              room="Room 1"
              doctor={ROOM_DOCTORS["Room 1"]}
              token={room1?.queueToken}
              serving={Boolean(room1)}
            />
            <NowServingCard
              room="Room 2"
              doctor={ROOM_DOCTORS["Room 2"]}
              token={room2?.queueToken}
              serving={Boolean(room2)}
            />
          </>
        )}
      </div>

      <footer className="border-t border-[#2A2A2A] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A948F]">
            Waiting corridor · tokens only
          </div>
          <div className="text-xs text-[#8A948F]">{waiting.length} in line</div>
        </div>
        {waiting.length === 0 ? (
          <p className="text-sm text-[#66706B]">No students currently waiting.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {waiting.map((appt, idx) => (
              <div
                key={appt.id}
                className={`border px-4 py-2 font-mono text-lg font-bold ${
                  idx === 0
                    ? "border-[#087F6C] bg-[#087F6C] text-white"
                    : "border-[#333333] bg-[#1A1A1A] text-white"
                }`}
              >
                {appt.queueToken || "—"}
                {idx === 0 && (
                  <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-wider">
                    Next
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] text-[#66706B]">
          Student names are not shown on this public board. Listen for your token, or watch YɛnCare on
          your phone.
        </p>
      </footer>
    </div>
  );
}
