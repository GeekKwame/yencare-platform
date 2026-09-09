import { useEffect, useState } from "react";
import {
  CLINIC_SITE_LABELS,
  DEFAULT_CLINIC_SITE,
  getMockTodaysAppointments,
  mapAppointmentToCard,
  todayIsoDate,
} from "../data/mockAppointments";
import {
  getTodaysAppointments,
  updateAppointmentStatus,
} from "../services/appointments";

const StaffPortal = () => {
  const [clinicSite, setClinicSite] = useState(DEFAULT_CLINIC_SITE);
  const [appointments, setAppointments] = useState(() =>
    getMockTodaysAppointments(DEFAULT_CLINIC_SITE),
  );
  const [usingMock, setUsingMock] = useState(true);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRoster() {
      setLoading(true);
      setMessage("");
      try {
        const data = await getTodaysAppointments(clinicSite, todayIsoDate());
        if (cancelled) return;
        const list = Array.isArray(data) ? data.map(mapAppointmentToCard) : [];
        setAppointments(list);
        setUsingMock(false);
      } catch {
        if (cancelled) return;
        setAppointments(getMockTodaysAppointments(clinicSite));
        setUsingMock(true);
        setMessage("Backend unavailable — showing mock roster for today.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoster();
    return () => {
      cancelled = true;
    };
  }, [clinicSite]);

  async function handleCheckIn(id) {
    setCheckingInId(id);
    setMessage("");

    try {
      const updated = await updateAppointmentStatus(id, "CHECKED_IN");
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === id
            ? {
                ...appt,
                status: updated.status || "CHECKED_IN",
              }
            : appt,
        ),
      );
      setUsingMock(false);
      setMessage("Checked in via API.");
    } catch {
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === id ? { ...appt, status: "CHECKED_IN" } : appt,
        ),
      );
      setUsingMock(true);
      setMessage("Backend unavailable — check-in saved in local mock state.");
    } finally {
      setCheckingInId(null);
    }
  }

  const clinicLabel = CLINIC_SITE_LABELS[clinicSite] || clinicSite;
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const statusRank = {
    CHECKED_IN: 0,
    BOOKED: 1,
    WAITING: 2,
    CALLED: 3,
    COMPLETED: 4,
    NO_SHOW: 5,
    CANCELLED: 6,
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    const rankDiff = (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return String(a.time || "").localeCompare(String(b.time || ""));
  });

  return (
    <main className="mx-auto max-w-5xl px-5 pt-22 pb-16 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#173b3a] mb-1">Today&apos;s Appointments</h1>
          <p className="text-sm text-gray-500">
            {clinicLabel} · {todayLabel}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-[#173b3a]">
          <span className="font-semibold">Clinic site</span>
          <select
            value={clinicSite}
            onChange={(event) => setClinicSite(event.target.value)}
            className="rounded-xl border border-[#dce8df] bg-white px-3 py-2 text-sm"
          >
            {Object.entries(CLINIC_SITE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            usingMock
              ? "bg-[#fff6e8] text-[#8a5a12]"
              : "bg-[#E7F5F1] text-[#176b5f]"
          }`}
        >
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading today&apos;s roster…</p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-gray-500">No appointments for this clinic today.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAppointments.map((appt) => (
            <div
              key={appt.id}
              className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-[0_14px_30px_rgba(23,59,58,0.07)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#c37d32]">
                  {appt.reference}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    appt.status === "CHECKED_IN"
                      ? "bg-[#176b5f] text-white"
                      : "bg-[#dce8df] text-[#173b3a]"
                  }`}
                >
                  {appt.status}
                </span>
              </div>

              <h3 className="mt-3 text-lg font-bold text-[#173b3a]">{appt.patientName}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {appt.service} · {appt.time}
              </p>

              {appt.status === "BOOKED" && (
                <button
                  type="button"
                  onClick={() => handleCheckIn(appt.id)}
                  disabled={checkingInId === appt.id}
                  className="mt-4 w-full rounded-xl bg-[#176b5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
                >
                  {checkingInId === appt.id ? "Checking in…" : "Check In"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default StaffPortal;
