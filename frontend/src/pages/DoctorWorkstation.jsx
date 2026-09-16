import { useEffect, useMemo, useState } from "react";
import {
  CLINIC_SITE_LABELS,
  DEFAULT_CLINIC_SITE,
  getMockTodaysAppointments,
  mapAppointmentToCard,
  todayIsoDate,
} from "../data/mockAppointments";
import { getTodaysAppointments } from "../services/appointments";
import { listRooms } from "../services/catalog";
import { advanceQueue, callNextPatient, markQueueNoShow } from "../services/queue";

const FALLBACK_ROOMS = [
  { id: "mock-room-1", name: "Room 1", clinicSite: "students-clinic" },
  { id: "mock-room-2", name: "Room 2", clinicSite: "students-clinic" },
  { id: "mock-room-gf7", name: "Consultation Room GF7", clinicSite: "social-science-gf7" },
];

function roomKey(room) {
  return String(room?.id || room?._id || room?.name || "");
}

export default function DoctorWorkstation({ staff }) {
  const [clinicSite, setClinicSite] = useState(staff?.clinicSite || DEFAULT_CLINIC_SITE);
  const [rooms, setRooms] = useState(FALLBACK_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [appointments, setAppointments] = useState(() =>
    getMockTodaysAppointments(staff?.clinicSite || DEFAULT_CLINIC_SITE, todayIsoDate()),
  );
  const [usingMock, setUsingMock] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [roomList, roster] = await Promise.all([
          listRooms().catch(() => FALLBACK_ROOMS),
          getTodaysAppointments(clinicSite, todayIsoDate()),
        ]);
        if (cancelled) return;

        const liveRooms = Array.isArray(roomList) && roomList.length > 0 ? roomList : FALLBACK_ROOMS;
        setRooms(liveRooms);

        const assigned = liveRooms.find(
          (room) =>
            staff?.assignedRoom &&
            String(room.name).toLowerCase() === String(staff.assignedRoom).toLowerCase(),
        );
        const siteRooms = liveRooms.filter((room) => room.clinicSite === clinicSite);
        const nextRoom = assigned || siteRooms[0] || liveRooms[0];
        setSelectedRoomId((current) => current || roomKey(nextRoom));

        const list = Array.isArray(roster) ? roster.map(mapAppointmentToCard) : [];
        if (list.length === 0) {
          setAppointments(getMockTodaysAppointments(clinicSite, todayIsoDate()));
          setUsingMock(true);
          setMessage("No live queue for today — showing mock consultation board.");
        } else {
          setAppointments(list);
          setUsingMock(false);
          setMessage("");
        }
      } catch {
        if (cancelled) return;
        setRooms(FALLBACK_ROOMS);
        setAppointments(getMockTodaysAppointments(clinicSite, todayIsoDate()));
        setUsingMock(true);
        setMessage("Backend unavailable — consultation board is using mock data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clinicSite, staff?.assignedRoom]);

  const selectedRoom = rooms.find((room) => roomKey(room) === selectedRoomId) || rooms[0];
  const selectedName = selectedRoom?.name || staff?.assignedRoom || "Room 1";

  const roomAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      if (!appt.roomName && !appt.roomId) return true;
      if (appt.roomId && selectedRoom && String(appt.roomId) === roomKey(selectedRoom)) return true;
      return String(appt.roomName || "").toLowerCase() === String(selectedName).toLowerCase();
    });
  }, [appointments, selectedRoom, selectedName]);

  const called = roomAppointments.find((appt) => appt.status === "CALLED");
  const waiting = roomAppointments
    .filter((appt) => appt.status === "WAITING")
    .sort((a, b) => String(a.queueToken || "").localeCompare(String(b.queueToken || "")));

  async function handleCallNext({ completePrevious = false } = {}) {
    if (!selectedRoom) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await callNextPatient({
        roomId: selectedRoom.id || selectedRoom._id,
        completePrevious,
      });
      if (!result.appointment) {
        setMessage(result.message || `No waiting patients for ${selectedName}.`);
        return;
      }
      const card = mapAppointmentToCard(result.appointment);
      setAppointments((prev) => {
        const without = prev.filter((appt) => appt.id !== card.id);
        return [...without, card];
      });
      setUsingMock(false);
      setMessage(result.message || `Called ${card.queueToken} to ${selectedName}.`);
    } catch {
      const next = waiting[0];
      if (!next) {
        setMessage(`No waiting patients for ${selectedName}.`);
        return;
      }
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === next.id ? { ...appt, status: "CALLED" } : appt,
        ),
      );
      setUsingMock(true);
      setMessage(`Backend unavailable — called ${next.queueToken || next.patientName} in mock state.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!called) return;
    setBusy(true);
    try {
      await advanceQueue({ appointmentId: called.id });
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === called.id ? { ...appt, status: "COMPLETED" } : appt)),
      );
      setUsingMock(false);
      setMessage(`Visit completed for ${called.patientName}.`);
    } catch {
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === called.id ? { ...appt, status: "COMPLETED" } : appt)),
      );
      setUsingMock(true);
      setMessage("Backend unavailable — completed visit in local mock state.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNoShow() {
    if (!called) return;
    if (!window.confirm(`Mark ${called.patientName} as no-show?`)) return;
    setBusy(true);
    try {
      await markQueueNoShow({ appointmentId: called.id });
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === called.id ? { ...appt, status: "NO_SHOW" } : appt)),
      );
      setUsingMock(false);
      setMessage(`${called.patientName} marked no-show.`);
    } catch {
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === called.id ? { ...appt, status: "NO_SHOW" } : appt)),
      );
      setUsingMock(true);
      setMessage("Backend unavailable — no-show saved in local mock state.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-8 pb-16 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Consultation workstation
          </p>
          <h1 className="mb-1 text-3xl font-bold text-[#173b3a]">Call next patient</h1>
          <p className="text-sm text-gray-500">
            {CLINIC_SITE_LABELS[clinicSite] || clinicSite} · bound to {selectedName}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-[#173b3a]">
            <span className="font-semibold">Clinic site</span>
            <select
              value={clinicSite}
              onChange={(event) => {
                setClinicSite(event.target.value);
                setSelectedRoomId("");
              }}
              className="rounded-xl border border-[#dce8df] bg-white px-3 py-2 text-sm outline-none focus:border-[#176b5f]"
            >
              {Object.entries(CLINIC_SITE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-[#173b3a]">
            <span className="font-semibold">Active room</span>
            <select
              value={selectedRoomId}
              onChange={(event) => setSelectedRoomId(event.target.value)}
              className="rounded-xl border border-[#dce8df] bg-white px-3 py-2 text-sm outline-none focus:border-[#176b5f]"
            >
              {rooms
                .filter((room) => room.clinicSite === clinicSite)
                .map((room) => (
                  <option key={roomKey(room)} value={roomKey(room)}>
                    {room.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      {message && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            usingMock ? "bg-[#fff6e8] text-[#8a5a12]" : "bg-[#E7F5F1] text-[#176b5f]"
          }`}
        >
          {message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-[0_8px_20px_rgba(23,59,58,0.05)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#66706B]">Now in {selectedName}</h2>
          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Loading room board…</p>
          ) : called ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-3xl font-bold text-[#176b5f]">{called.queueToken || "—"}</p>
                  <h3 className="mt-2 text-xl font-bold text-[#173b3a]">{called.patientName}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {called.reference} · {called.service}
                    {called.studentIndex ? ` · Index ${called.studentIndex}` : ""}
                  </p>
                  {called.nhisNumber && (
                    <p className="mt-1 text-xs text-gray-400">NHIS {called.nhisNumber}</p>
                  )}
                </div>
                <span className="rounded-full bg-[#E7F5F1] px-3 py-1 text-xs font-semibold text-[#176b5f]">
                  CALLED
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={busy}
                  className="rounded-xl bg-[#176b5f] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
                >
                  Complete visit
                </button>
                <button
                  type="button"
                  onClick={handleNoShow}
                  disabled={busy}
                  className="rounded-xl border border-[#f1c0c0] bg-[#FFF5F5] px-3 py-2.5 text-sm font-semibold text-[#9B2C2C] hover:bg-[#fde8e8] disabled:opacity-60"
                >
                  Mark no-show
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-sm text-gray-500">No active consultation in this room.</p>
              <button
                type="button"
                onClick={() => handleCallNext()}
                disabled={busy || waiting.length === 0}
                className="mt-4 rounded-xl bg-[#176b5f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
              >
                {busy ? "Calling…" : "Call next patient"}
              </button>
            </div>
          )}

          {called && (
            <button
              type="button"
              onClick={() => handleCallNext({ completePrevious: true })}
              disabled={busy}
              className="mt-4 w-full rounded-xl border border-[#dce8df] px-4 py-2.5 text-sm font-semibold text-[#173b3a] hover:bg-[#f5faf7] disabled:opacity-60"
            >
              {busy ? "Working…" : "Call next (after completing current)"}
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-[#dce8df] bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#66706B]">
            Waiting for {selectedName} ({waiting.length})
          </h2>
          {waiting.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Queue is empty for this room.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {waiting.map((appt, index) => (
                <li
                  key={appt.id}
                  className="flex items-center justify-between rounded-xl border border-[#dce8df] px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-sm font-bold text-[#173b3a]">{appt.queueToken || "—"}</p>
                    <p className="text-xs text-gray-500">{appt.patientName}</p>
                  </div>
                  {index === 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#176b5f]">
                      Next
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
