import { useEffect, useMemo, useState } from "react";
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
import { registerPatient } from "../services/patients";

const STATUS_RANK = {
  CHECKED_IN: 0,
  BOOKED: 1,
  WAITING: 2,
  CALLED: 3,
  COMPLETED: 4,
  NO_SHOW: 5,
  CANCELLED: 6,
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "BOOKED", label: "Booked" },
  { id: "CHECKED_IN", label: "Arrived" },
  { id: "WAITING", label: "In queue" },
  { id: "CALLED", label: "In consult" },
  { id: "COMPLETED", label: "Completed" },
  { id: "NO_SHOW", label: "No-shows" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "CHECKED_IN":
      return "bg-[#176b5f] text-white";
    case "WAITING":
      return "bg-[#fff6e8] text-[#8a5a12]";
    case "CALLED":
      return "bg-[#E7F5F1] text-[#176b5f]";
    case "COMPLETED":
      return "bg-[#dce8df] text-[#173b3a]";
    case "NO_SHOW":
      return "bg-[#fde8e8] text-[#9b2c2c]";
    case "CANCELLED":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-[#dce8df] text-[#173b3a]";
  }
}

function matchesDeskQuery(appt, rawQuery) {
  const q = rawQuery.trim();
  if (!q) return true;

  const compact = q.replace(/\s+/g, "").toUpperCase();
  const name = String(appt.patientName || "").toUpperCase();
  const reference = String(appt.reference || "").replace(/\s+/g, "").toUpperCase();
  const index = String(appt.studentIndex || "").replace(/\s+/g, "").toUpperCase();
  const phone = String(appt.phone || "").replace(/\s+/g, "").toUpperCase();

  return (
    name.includes(q.toUpperCase()) ||
    reference.includes(compact) ||
    index === compact ||
    phone === compact ||
    phone.endsWith(compact)
  );
}

const StaffPortal = () => {
  const [clinicSite, setClinicSite] = useState(DEFAULT_CLINIC_SITE);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
  fullName: "",
  studentIndex: "",
  phoneNumber: "",
  visitType: "",
  priority: "Standard",
});
  const [appointments, setAppointments] = useState(() =>
    getMockTodaysAppointments(DEFAULT_CLINIC_SITE),
  );
  const [usingMock, setUsingMock] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");
  const [deskQuery, setDeskQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [highlightedId, setHighlightedId] = useState(null);
  const [lookupFeedback, setLookupFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRoster() {
      setLoading(true);
      setMessage("");
      try {
        const data = await getTodaysAppointments(clinicSite, todayIsoDate());
        if (cancelled) return;
        const list = Array.isArray(data) ? data.map(mapAppointmentToCard) : [];

        // Scaffold: if live roster is empty for today, show mock cards so
        // reception UI (Check In + badges) can still be verified.
        if (list.length === 0) {
          setAppointments(getMockTodaysAppointments(clinicSite));
          setUsingMock(true);
          setMessage(
            "No live appointments for today — showing mock roster for check-in practice.",
          );
        } else {
          setAppointments(list);
          setUsingMock(false);
        }
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

  async function applyStatus(id, nextStatus, successLabel) {
    setUpdatingId(id);
    setMessage("");

    try {
      const updated = await updateAppointmentStatus(id, nextStatus);
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === id
            ? {
                ...appt,
                status: updated.status || nextStatus,
                queueToken: updated.queueToken || appt.queueToken,
              }
            : appt,
        ),
      );
      setUsingMock(false);
      setMessage(`${successLabel} via API.`);
    } catch {
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === id ? { ...appt, status: nextStatus } : appt,
        ),
      );
      setUsingMock(true);
      setMessage(`Backend unavailable — ${successLabel.toLowerCase()} saved in local mock state.`);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleCheckIn(id) {
    return applyStatus(id, "CHECKED_IN", "Checked in");
  }

  async function handleWalkInSubmit(e) {
  e.preventDefault();
  console.log("form submitted");

  const patient = await registerPatient({
    fullName: walkInData.fullName,
    studentIndex: walkInData.studentIndex,
    phoneNumber: walkInData.phoneNumber,
  });

  const newCard = {
      id: crypto.randomUUID(),
    patientId: patient.id, 
    patientName: patient.fullName,
    reference: "W-" + Math.floor(Math.random() * 1000),
    service: walkInData.visitType,
    time: "Now",
    status: "CHECKED_IN",
    bookingType: "WALK_IN",
  };

  setAppointments((prev) => [...prev, newCard]);

  setIsWalkInOpen(false);
  setWalkInData({
    fullName: "",
    studentIndex: "",
    phoneNumber: "",
    visitType: "",
    priority: "Standard",
  });
}

  function handleCheckInToQueue(id) {
    return applyStatus(id, "WAITING", "Checked into queue");
  }

  function handleNoShow(id) {
    if (!window.confirm("Mark this appointment as a no-show?")) return;
    return applyStatus(id, "NO_SHOW", "Marked no-show");
  }

  function handleDeskLookup(event) {
    event.preventDefault();
    const q = deskQuery.trim();
    if (!q) {
      setLookupFeedback("");
      return;
    }

    const found = appointments.find((appt) => matchesDeskQuery(appt, q));
    if (!found) {
      setLookupFeedback(
        "No student found. Search by YC reference, student index, phone, or name from today’s roster.",
      );
      setHighlightedId(null);
      return;
    }

    setStatusFilter("all");
    setHighlightedId(found.id);
    setLookupFeedback(`Opened ${found.patientName} (${found.reference}).`);
    requestAnimationFrame(() => {
      document.getElementById(`staff-appt-${found.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  const clinicLabel = CLINIC_SITE_LABELS[clinicSite] || clinicSite;
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const metrics = useMemo(() => {
    const total = appointments.length;
    const arrived = appointments.filter((a) => a.status === "CHECKED_IN").length;
    const waiting = appointments.filter((a) => a.status === "WAITING").length;
    const inConsult = appointments.filter((a) => a.status === "CALLED").length;
    const completed = appointments.filter((a) => a.status === "COMPLETED").length;
    const walkIns = appointments.filter((a) => a.bookingType === "WALK_IN").length;
    const noShows = appointments.filter((a) => a.status === "NO_SHOW").length;
    return { total, arrived, waiting, inConsult, completed, walkIns, noShows };
  }, [appointments]);

  const arrivedPatients = appointments.filter((a) => a.status === "CHECKED_IN");

  const filteredAppointments = appointments
    .filter((appt) => matchesDeskQuery(appt, deskQuery))
    .filter((appt) => (statusFilter === "all" ? true : appt.status === statusFilter))
    .sort((a, b) => {
      const rankDiff = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
      if (rankDiff !== 0) return rankDiff;
      return String(a.time || "").localeCompare(String(b.time || ""));
    });

  const kpiCards = [
    {
      label: "Total Patients",
      value: metrics.total,
      hint: "Roster today",
      className: "border-[#dce8df]",
      valueClass: "text-[#173b3a]",
      labelClass: "text-gray-500",
    },
    {
      label: "Arrived",
      value: metrics.arrived,
      hint: "Awaiting desk",
      className: "border-[#176b5f] bg-[#E7F5F1]/40",
      valueClass: "text-[#176b5f]",
      labelClass: "text-[#176b5f]",
    },
    {
      label: "In Queue",
      value: metrics.waiting,
      hint: "Live waiting",
      className: "border-[#dce8df]",
      valueClass: "text-[#8a5a12]",
      labelClass: "text-[#8a5a12]",
    },
    {
      label: "In Consult",
      value: metrics.inConsult,
      hint: "Being seen",
      className: "border-[#dce8df]",
      valueClass: "text-[#176b5f]",
      labelClass: "text-[#176b5f]",
    },
    {
      label: "Completed",
      value: metrics.completed,
      hint: "Concluded",
      className: "border-[#dce8df]",
      valueClass: "text-[#173b3a]",
      labelClass: "text-gray-500",
    },
    {
      label: "Walk-Ins",
      value: metrics.walkIns,
      hint: "Unscheduled",
      className: "border-[#2B6CB0]/40 bg-[#EBF8FF]/30",
      valueClass: "text-[#2B6CB0]",
      labelClass: "text-[#2B6CB0]",
    },
    {
      label: "No-Shows",
      value: metrics.noShows,
      hint: "Missed slots",
      className: "border-[#9B2C2C]/50 bg-[#FFF5F5]/40",
      valueClass: "text-[#9B2C2C]",
      labelClass: "text-[#9B2C2C]",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 pt-22 pb-16 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Clinic Operations Dashboard
          </p>
          <h1 className="mb-1 text-3xl font-bold text-[#173b3a]">
            Today&apos;s Clinical Operations
          </h1>
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
        <button
          type="button"
          onClick={() => setIsWalkInOpen(true)}
          className="shrink-0 rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14594f]"
        >
          Add Walk-in
        </button>

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

      <form
        onSubmit={handleDeskLookup}
        className="mb-5 flex flex-col gap-2.5 rounded-2xl border border-[#dce8df] bg-white p-3.5 shadow-[0_8px_20px_rgba(23,59,58,0.05)] sm:flex-row"
      >
        <input
          type="search"
          value={deskQuery}
          onChange={(event) => {
            setDeskQuery(event.target.value);
            setLookupFeedback("");
            if (!event.target.value.trim()) setHighlightedId(null);
          }}
          placeholder="Desk lookup: YC reference, student index, phone, or name…"
          className="w-full rounded-xl border border-[#dce8df] px-3 py-2.5 text-sm text-[#173b3a] outline-none focus:border-[#176b5f]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14594f]"
        >
          Find & open record
        </button>
      </form>
      {lookupFeedback && (
        <p className="mb-4 text-sm text-gray-500">{lookupFeedback}</p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border bg-white p-4 shadow-[0_8px_20px_rgba(23,59,58,0.04)] ${card.className}`}
          >
            <div
              className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${card.labelClass}`}
            >
              {card.label}
            </div>
            <div className={`text-3xl font-bold tabular-nums ${card.valueClass}`}>
              {card.value}
            </div>
            <div className="mt-1 text-[10px] text-gray-500">{card.hint}</div>
          </div>
        ))}
      </div>

      {!loading && arrivedPatients.length > 0 && (
        <section className="mb-6 rounded-2xl border border-[#99D5C8] bg-[#E7F5F1] p-4">
          <div className="mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#176b5f]">
              Waiting at reception ({arrivedPatients.length})
            </h2>
            <p className="mt-0.5 text-xs text-gray-600">
              Students have arrived. Verify ID and check them into the live queue.
            </p>
          </div>
          <div className="space-y-2">
            {arrivedPatients.map((appt) => (
              <div
                key={appt.id}
                className="flex flex-col gap-3 rounded-xl border border-[#99D5C8] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-[#173b3a]">
                    {appt.patientName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {appt.reference} · {appt.time}
                    {appt.studentIndex ? ` · Index ${appt.studentIndex}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckInToQueue(appt.id)}
                  disabled={updatingId === appt.id}
                  className="shrink-0 rounded-xl bg-[#176b5f] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#14594f] disabled:opacity-60"
                >
                  {updatingId === appt.id ? "Updating…" : "Check In to Queue"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = statusFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-[#176b5f] text-white"
                  : "border border-[#dce8df] bg-white text-[#173b3a] hover:bg-[#E7F5F1]"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading today&apos;s roster…</p>
      ) : filteredAppointments.length === 0 ? (
        <p className="text-sm text-gray-500">
          {appointments.length === 0
            ? "No appointments for this clinic today."
            : "No appointments match this filter or search."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAppointments.map((appt) => (
            <div
              key={appt.id}
              id={`staff-appt-${appt.id}`}
              className={`rounded-2xl border bg-white p-5 shadow-[0_14px_30px_rgba(23,59,58,0.07)] ${
                highlightedId === appt.id
                  ? "border-[#176b5f] ring-2 ring-[#176b5f]/25"
                  : "border-[#dce8df]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-[#c37d32]">
                  {appt.reference}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                    appt.status,
                  )}`}
                >
                  {appt.status}
                  {appt.queueToken ? ` · ${appt.queueToken}` : ""}
                </span>
              </div>

              <h3 className="mt-3 text-lg font-bold text-[#173b3a]">
                {appt.patientName}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {appt.service} · {appt.time}
              </p>
              {(appt.studentIndex || appt.phone) && (
                <p className="mt-1 text-xs text-gray-400">
                  {[
                    appt.studentIndex ? `Index ${appt.studentIndex}` : null,
                    appt.phone || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {appt.bookingType === "WALK_IN" && (
                <span className="mt-2 inline-block rounded-md border border-[#BEE3F8] bg-[#EBF8FF] px-1.5 py-0.5 text-[10px] font-bold text-[#2B6CB0]">
                  WALK-IN
                </span>
              )}

              {appt.status === "BOOKED" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckIn(appt.id)}
                    disabled={updatingId === appt.id}
                    className="rounded-xl bg-[#176b5f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
                  >
                    {updatingId === appt.id ? "Updating…" : "Check In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNoShow(appt.id)}
                    disabled={updatingId === appt.id}
                    className="rounded-xl border border-[#f1c0c0] bg-[#FFF5F5] px-3 py-2 text-sm font-semibold text-[#9B2C2C] hover:bg-[#fde8e8] disabled:opacity-60"
                  >
                    No-Show
                  </button>
                </div>
              )}

              {appt.status === "CHECKED_IN" && (
                <button
                  type="button"
                  onClick={() => handleCheckInToQueue(appt.id)}
                  disabled={updatingId === appt.id}
                  className="mt-4 w-full rounded-xl bg-[#176b5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
                >
                  {updatingId === appt.id ? "Updating…" : "Check In to Queue"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isWalkInOpen && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/40">
    <div className="bg-white p-6 rounded-xl">
      <form onSubmit={handleWalkInSubmit}>
      <input name="fullName"
      value={walkInData.fullName}
      onChange={(e) => setWalkInData((prev) => ({...prev, fullName: e.target.value}))}
      placeholder="Full Name"
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm mb-2"
       />
      <input name="studentIndex" 
      value={walkInData.studentIndex} 
      onChange={(e) => setWalkInData((prev) => ({...prev, studentIndex: e.target.value}))}
      placeholder="Student Index"
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm mb-2"
      />
      <input name="phoneNumber" 
      value={walkInData.phoneNumber} 
      onChange={(e) => setWalkInData((prev) => ({...prev, phoneNumber: e.target.value}))}
      placeholder="Phone Number"
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm mb-2"
      />
      <input name="visitType" 
      value={walkInData.visitType} 
      onChange={(e) => setWalkInData((prev) => ({...prev, visitType: e.target.value}))}
      placeholder="Visit Type"
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm mb-2"
      />
      <select name="priority" 
      value={walkInData.priority} 
      onChange={(e) => setWalkInData((prev) => ({...prev, priority: e.target.value}) )}
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm mb-2"
      >
        <option value="Standard">Standard</option>
        <option value="Urgent">Urgent</option>
      </select>
    <div className="flex gap-2 mt-3">
      <button type="submit" className="rounded-xl bg-[#176b5f] px-4 py-2 text-sm font-semibold text-white">Add to Queue</button>
      <button type="button" onClick={() => setIsWalkInOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm">Close</button>
    </div>  
    </form>
    </div>
  </div>
)}
    </main>
  );
};

export default StaffPortal;
