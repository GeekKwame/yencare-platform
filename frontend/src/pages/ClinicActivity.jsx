import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getArriveByLabel } from "../data/bookingOptions";
import { CLINIC_SITE_LABELS } from "../data/mockAppointments";
import { mapAppointment } from "../lib/appointmentView";
import { arriveAppointment, lookupAppointment } from "../services/appointments";
import { getClinicActivity } from "../services/queue";

function waitText(minutes) {
  if (!minutes) return "No wait";
  if (minutes >= 35) return "30–40 min";
  return `${Math.max(0, minutes - 5)}–${minutes + 5} min`;
}

export default function ClinicActivity() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialRef = params.get("ref") || "";
  const [clinicSite, setClinicSite] = useState("students-clinic");
  const [activity, setActivity] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [arriving, setArriving] = useState(false);
  const [justArrived, setJustArrived] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAppointment() {
      if (!initialRef) return;
      try {
        const found = await lookupAppointment({ reference: initialRef });
        if (!cancelled) {
          setAppointment(found);
          if (found?.clinicSite) setClinicSite(found.clinicSite);
        }
      } catch {
        if (!cancelled) setAppointment(null);
      }
    }
    loadAppointment();
    return () => {
      cancelled = true;
    };
  }, [initialRef]);

  async function loadActivity(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await getClinicActivity(clinicSite);
      setActivity(data);
      setError("");
    } catch {
      setError("Live queue sync temporarily unavailable. Reception check-in is proceeding as normal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
    const id = window.setInterval(() => loadActivity(true), 15000);
    return () => window.clearInterval(id);
  }, [clinicSite]);

  const view = appointment ? mapAppointment(appointment) : null;
  const isUserBookedHere = view && view.clinicSite === clinicSite;
  const waitingTokens = activity?.waitingTokens || [];
  const activeRooms = activity?.activeRooms || activity?.rooms || [];

  async function handleArrive() {
    if (!view?.referenceCode) return;
    setArriving(true);
    try {
      const updated = await arriveAppointment(view.referenceCode, {
        phone: view.phoneNumber !== "—" ? view.phoneNumber : undefined,
      });
      setAppointment(updated);
      setJustArrived(true);
      await loadActivity(true);
      const ref = updated?.referenceCode || view.referenceCode;
      if (ref) navigate(`/queue?ref=${encodeURIComponent(ref)}`);
    } catch (err) {
      setError(err.response?.data?.error || "Could not record arrival. Please tell reception.");
    } finally {
      setArriving(false);
    }
  }

  const estWait = useMemo(
    () => waitText(activity?.estimatedWaitMinutes || 0),
    [activity],
  );

  return (
    <main className="mx-auto max-w-xl px-5 pb-16 pt-28 sm:px-8">
      <div className="rounded-3xl border border-[#dce8df] bg-white p-5 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-7">
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5">
          <Link
            to={view ? `/appointments` : "/"}
            className="text-xs font-semibold text-[#66706B] hover:text-[#173b3a]"
          >
            {view ? "My appointment" : "Home"}
          </Link>
          <div className="text-center">
            <h1 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              Live Clinic Activity
            </h1>
            <p className="text-[10px] text-[#66706B]">Pre-check-in facility status</p>
          </div>
          <button
            type="button"
            onClick={() => loadActivity()}
            className="text-xs font-semibold text-[#66706B] hover:text-[#173b3a]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#D8DCD9] bg-[#F7F8F7] p-2.5 text-xs">
          <span className="font-semibold text-[#111111]">
            {activity && activity.isOpen === false
              ? "Clinic closed"
              : activity?.demandLevel === "high"
                ? "Open · High clinic load"
                : "Open · Normal flow"}
          </span>
          <span className="text-[11px] text-[#66706B]">
            {loading ? "Updating…" : "Live"}
          </span>
        </div>

        <div className="mt-3 flex gap-1 rounded-xl border border-[#D8DCD9] bg-[#F7F8F7] p-1 text-xs">
          {Object.entries(CLINIC_SITE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setClinicSite(value)}
              className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
                clinicSite === value
                  ? "bg-[#111111] text-white"
                  : "text-[#66706B] hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-[#FCD34D] bg-[#FEF7ED] p-3.5 text-xs text-[#78350F]">
            {error}
          </div>
        )}

        {isUserBookedHere && view && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-[#087F6C] p-4">
            <div className="absolute top-0 right-0 bg-[#087F6C] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Your booking
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B]">
              Reference code
            </p>
            <p className="font-mono text-2xl font-bold text-[#111111]">{view.referenceCode}</p>
            <p className="mt-2 text-xs font-bold text-[#087F6C]">
              {view.status === "BOOKED"
                ? "BOOKED · NOT ARRIVED"
                : view.status === "CHECKED_IN"
                  ? "ARRIVED · AWAITING RECEPTION"
                  : view.status === "WAITING" || view.status === "CALLED"
                    ? `IN QUEUE · ${view.queueToken || "—"}`
                    : view.status}
            </p>
            {view.status === "BOOKED" && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E5E7E6] pt-3">
                <div>
                  <p className="text-xs font-semibold text-[#111111]">At the clinic now?</p>
                  <p className="text-[11px] text-[#66706B]">Let reception know you have arrived</p>
                </div>
                <button
                  type="button"
                  disabled={arriving}
                  onClick={handleArrive}
                  className="shrink-0 rounded-xl bg-[#087F6C] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#066354] disabled:opacity-60"
                >
                  {arriving ? "Recording…" : "I've arrived"}
                </button>
              </div>
            )}
            {(justArrived || view.status === "CHECKED_IN") && (
              <p className="mt-3 text-xs font-semibold text-[#087F6C]">
                Present {view.referenceCode} at the desk. Staff will assign your live token.
              </p>
            )}
            {(view.status === "WAITING" || view.status === "CALLED") && (
              <Link
                to={`/queue?ref=${encodeURIComponent(view.referenceCode)}`}
                className="mt-3 inline-block text-xs font-bold text-[#087F6C] hover:underline"
              >
                View my queue status
              </Link>
            )}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-[#D8DCD9] bg-[#F7F8F7] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#66706B]">Now serving</p>
          <p className="mt-2 font-mono text-4xl font-extrabold text-[#111111]">
            {activity?.nowServingToken || "None"}
          </p>
          <p className="mt-1 text-xs text-[#66706B]">
            {activity?.nowServingRoom || "Consulting room"}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#D8DCD9] p-4">
            <p className="text-xs font-semibold text-[#66706B]">Waiting in clinic</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {activity?.waitingCount ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-[#D8DCD9] p-4">
            <p className="text-xs font-semibold text-[#66706B]">Est. clinic wait</p>
            <p className="mt-1 text-2xl font-bold">{estWait}</p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-[#D8DCD9] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider">Waiting queue corridor</h2>
            <span className="text-xs text-[#66706B]">{waitingTokens.length} in line</span>
          </div>
          {waitingTokens.length === 0 ? (
            <p className="border border-dashed border-[#D8DCD9] bg-[#F7F8F7] py-6 text-center text-xs text-[#66706B]">
              No patients currently waiting. Walk-ins can be seen promptly.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {waitingTokens.map((token, idx) => (
                <div
                  key={`${token}-${idx}`}
                  className="border border-[#D8DCD9] bg-[#F7F8F7] px-3 py-1.5 font-mono text-xs font-bold"
                >
                  {token}
                  {idx === 0 ? <span className="ml-1 font-sans text-[10px] text-blue-700">Next</span> : null}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] font-semibold text-[#087F6C]">
            Student identities protected · only token numbers shown
          </p>
        </div>

        <div className="mt-3 space-y-2.5 rounded-2xl border border-[#D8DCD9] p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider">Active consultation rooms</h2>
          {activeRooms.length === 0 ? (
            <p className="text-xs text-[#66706B]">No rooms currently reported.</p>
          ) : (
            activeRooms.map((room) => (
              <div
                key={room.room || room.name}
                className="flex items-center justify-between border border-[#E5E7E6] bg-[#F7F8F7] p-3"
              >
                <div>
                  <p className="text-xs font-bold">{room.room || room.name}</p>
                  <p className="text-[11px] text-[#66706B]">
                    {room.doctorName}
                    {room.specialty ? ` · ${room.specialty}` : ""}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold">
                  {room.currentToken || room.nowServingToken
                    ? `Serving ${room.currentToken || room.nowServingToken}`
                    : "Ready for next"}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-[#D8DCD9] p-4 text-xs leading-5 text-[#3D4541]">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider">Arrival recommendations</h2>
          <p className="font-semibold text-[#111111]">
            {view?.appointmentTime
              ? `Your appointment is at ${view.timeLabel}. Arrive by ${getArriveByLabel(view.appointmentTime) || "15 minutes earlier"}.`
              : "Plan to arrive 15 minutes before your scheduled appointment time."}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-[#66706B]">
            <li>Carry your valid KNUST Student ID for verification at reception.</li>
            <li>Wait nearby until 15 minutes before your slot.</li>
            <li>Urgent triage takes clinical precedence over scheduled appointments.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
