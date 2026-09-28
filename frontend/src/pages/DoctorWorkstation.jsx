import { useEffect, useMemo, useRef, useState } from "react";
import ElapsedTimer from "../components/staff/ElapsedTimer";
import {
  CLINIC_SITE_LABELS,
  DEFAULT_CLINIC_SITE,
} from "../data/mockAppointments";
import { useClinicRoster } from "../hooks/useClinicRoster";
import { accraTodayIso } from "../lib/accraTime";
import { announcePatientCall } from "../lib/clinicSpeech";
import { listRooms } from "../services/catalog";
import { advanceQueue, callNextPatient, markQueueNoShow } from "../services/queue";

function roomKey(room) {
  return String(room?.id || room?._id || room?.name || "");
}

export default function DoctorWorkstation({ staff }) {
  const isDoctor = staff?.role === "DOCTOR";
  const [clinicSite, setClinicSite] = useState(staff?.clinicSite || DEFAULT_CLINIC_SITE);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => accraTodayIso());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notification, setNotification] = useState("");
  const prevCountRef = useRef(null);
  const { appointments, loading, error, reload } = useClinicRoster(clinicSite, selectedDate, {
    pollMs: 10000,
  });

  useEffect(() => {
    if (appointments && Array.isArray(appointments)) {
      if (prevCountRef.current !== null && appointments.length > prevCountRef.current) {
        const latest = appointments[appointments.length - 1];
        setNotification(`New booking received: ${latest?.patientName || "Student"} (${latest?.time || "Today"})`);
      }
      prevCountRef.current = appointments.length;
    }
  }, [appointments]);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      try {
        const roomList = await listRooms();
        if (cancelled) return;
        const liveRooms = Array.isArray(roomList) ? roomList : [];
        setRooms(liveRooms);
        const assigned = liveRooms.find(
          (room) =>
            staff?.assignedRoom &&
            String(room.name).toLowerCase() === String(staff.assignedRoom).toLowerCase(),
        );
        const siteRooms = liveRooms.filter((room) => room.clinicSite === clinicSite);
        const nextRoom = assigned || siteRooms[0] || liveRooms[0];
        setSelectedRoomId((current) => current || roomKey(nextRoom));
      } catch {
        if (!cancelled) setRooms([]);
      }
    }

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [clinicSite, staff?.assignedRoom]);

  useEffect(() => {
    const syncToday = () => {
      const today = accraTodayIso();
      setSelectedDate((current) => (current === today ? current : today));
    };
    syncToday();
    const id = window.setInterval(syncToday, 30000);
    return () => window.clearInterval(id);
  }, []);

  const selectedRoom = rooms.find((room) => roomKey(room) === selectedRoomId) || rooms[0];
  const selectedName = selectedRoom?.name || staff?.assignedRoom || "Room";

  const roomAppointments = useMemo(() => {
    // A booked doctor should only have access to call and view patients booked with him
    if (staff?.role === "DOCTOR") return appointments;

    return appointments.filter((appt) => {
      if (appt.roomId && selectedRoom && String(appt.roomId) === roomKey(selectedRoom)) return true;
      return String(appt.roomName || "").toLowerCase() === String(selectedName).toLowerCase();
    });
  }, [appointments, selectedRoom, selectedName, staff?.role]);

  const called = roomAppointments.find((appt) => appt.status === "CALLED");
  const waiting = roomAppointments
    .filter((appt) => appt.status === "WAITING")
    .sort((a, b) => String(a.queueToken || "").localeCompare(String(b.queueToken || ""), undefined, {
      numeric: true,
    }));

  async function handleCallNext({ completePrevious = false } = {}) {
    if (!selectedRoom) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await callNextPatient({
        roomId: selectedRoom.id || selectedRoom._id,
        completePrevious,
      });
      const calledAppt = result.appointment;
      if (!calledAppt) {
        setMessage(result.message || `No waiting patients for ${selectedName}.`);
        await reload();
        return;
      }
      const calledRoomName = result.room?.name || selectedName;
      const name = calledAppt.patientId?.fullName || calledAppt.patientName || "Patient";
      announcePatientCall(
        name,
        calledRoomName,
        calledAppt.queueToken || result.queueToken,
      );
      setMessage(result.message || `Called next patient to ${calledRoomName}.`);
      await reload();
    } catch (err) {
      setMessage(err.response?.data?.error || `Could not call the next patient for ${selectedName}.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!called) return;
    setBusy(true);
    try {
      await advanceQueue({ appointmentId: called.id });
      setMessage(`Visit completed for ${called.patientName}.`);
      await reload();
    } catch (err) {
      setMessage(err.response?.data?.error || "Could not complete this visit.");
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
      setMessage(`${called.patientName} marked no-show.`);
      await reload();
    } catch (err) {
      setMessage(err.response?.data?.error || "Could not mark no-show.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-8 pb-16 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Consultation workstation · {isDoctor ? (staff?.name || "Doctor") : "Staff"}
          </p>
          <h1 className="mb-1 text-3xl font-bold text-[#173b3a]">Call next patient</h1>
          <p className="text-sm font-semibold text-[#176b5f]">
            {selectedDate} · {CLINIC_SITE_LABELS[clinicSite] || clinicSite} · bound to {selectedName}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {isDoctor ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#dce8df] bg-[#f7f8f7] px-3.5 py-2 text-xs">
              <span className="font-semibold text-gray-500">Assigned:</span>
              <span className="font-bold text-[#173b3a]">{CLINIC_SITE_LABELS[clinicSite] || clinicSite}</span>
              <span className="text-gray-300">|</span>
              <span className="font-bold text-[#176b5f]">{selectedName}</span>
            </div>
          ) : (
            <>
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
            </>
          )}
          <button
            type="button"
            onClick={() => setSelectedDate(accraTodayIso())}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              selectedDate === accraTodayIso()
                ? "border-[#176b5f] bg-[#176b5f] text-white"
                : "border-[#dce8df] bg-white text-[#173b3a]"
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {notification && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#99D5C8] bg-[#E7F5F1] px-4 py-3 text-sm text-[#087F6C]">
          <span>🔔 {notification}</span>
          <button
            type="button"
            onClick={() => setNotification("")}
            className="text-xs font-semibold underline hover:text-[#066A5A]"
          >
            Dismiss
          </button>
        </div>
      )}

      {(message || error) && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
            error
              ? "border border-warning-border bg-warning-soft text-warning"
              : "border border-accent-border bg-accent-soft text-accent"
          }`}
        >
          <p>{error || message}</p>
          {error && (
            <button
              type="button"
              onClick={() => void reload()}
              className="min-h-11 border border-clinic-border bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-secondary"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-[0_8px_20px_rgba(23,59,58,0.05)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#66706B]">
            {isDoctor ? `Now consulting: ${staff?.name || selectedName}` : `Now in ${selectedName}`}
          </h2>
          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Loading room board…</p>
          ) : called ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-3xl font-bold text-[#176b5f]">
                    {called.queueToken || "—"}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#173b3a]">{called.patientName}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {called.reference} · {called.service}
                    {called.studentIndex ? ` · Index ${called.studentIndex}` : ""}
                  </p>
                  <ElapsedTimer resetKey={called.id} className="mt-2 text-sm text-[#176b5f]" />
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
                disabled={busy || !selectedRoom}
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
            {isDoctor ? `Waiting for ${staff?.name || selectedName} (${waiting.length})` : `Waiting for ${selectedName} (${waiting.length})`}
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
                    <p className="font-mono text-sm font-bold text-[#173b3a]">
                      {appt.queueToken || "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {appt.patientName} {appt.roomName ? `· ${appt.roomName}` : ""}
                    </p>
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
