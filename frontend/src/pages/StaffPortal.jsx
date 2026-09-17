import { useEffect, useMemo, useState } from "react";
import StaffLiveQueue from "../components/staff/StaffLiveQueue";
import StaffRoster from "../components/staff/StaffRoster";
import StaffToday from "../components/staff/StaffToday";
import StaffWalkIn from "../components/staff/StaffWalkIn";
import StaffAppointmentDetail from "../components/staff/StaffAppointmentDetail";
import StaffChangeAppointment from "../components/staff/StaffChangeAppointment";
import StaffNoShowConfirm from "../components/staff/StaffNoShowConfirm";
import { matchesDeskQuery } from "../components/staff/staffUtils";
import StaffWorkstationBar from "../components/StaffWorkstationBar";
import { useStaffAuth } from "../context/StaffAuthContext";
import {
  CLINIC_SITE_LABELS,
  DEFAULT_CLINIC_SITE,
  mapAppointmentToCard,
} from "../data/mockAppointments";
import { useClinicRoster } from "../hooks/useClinicRoster";
import { accraTodayIso } from "../lib/accraTime";
import DoctorWorkstation from "./DoctorWorkstation";
import { updateAppointmentStatus } from "../services/appointments";
import { listRooms } from "../services/catalog";
import { advanceQueue, callNextPatient, markQueueNoShow } from "../services/queue";

const SEED_DATE = "2026-09-15";

const StaffPortal = () => {
  const { staff, logout } = useStaffAuth();
  const [clinicSite, setClinicSite] = useState(staff?.clinicSite || DEFAULT_CLINIC_SITE);
  const [selectedDate, setSelectedDate] = useState(() => accraTodayIso());
  const [view, setView] = useState("today");
  const [deskQuery, setDeskQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [highlightedId, setHighlightedId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [lookupFeedback, setLookupFeedback] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [busyRoomId, setBusyRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [rooms, setRooms] = useState([]);

  const { appointments, setAppointments, loading, error, usingLive, reload } =
    useClinicRoster(clinicSite, selectedDate, { pollMs: 15000 });

  useEffect(() => {
    let cancelled = false;
    listRooms()
      .then((rows) => {
        if (cancelled) return;
        setRooms(
          (Array.isArray(rows) ? rows : []).filter((room) => room.clinicSite === clinicSite),
        );
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [clinicSite]);

  const clinicLabel = CLINIC_SITE_LABELS[clinicSite] || clinicSite;
  const isSelectedToday = selectedDate === accraTodayIso();
  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "";
    const [year, month, day] = selectedDate.split("-").map(Number);
    if (!year || !month || !day) return selectedDate;
    return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  async function applyStatus(id, nextStatus, successLabel) {
    setUpdatingId(id);
    setMessage("");
    try {
      const updated = await updateAppointmentStatus(id, nextStatus);
      const card = mapAppointmentToCard(updated);
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === id ? { ...appt, ...card, status: card.status || nextStatus } : appt)),
      );
      setMessage(`${successLabel}.`);
      await reload();
    } catch (err) {
      setMessage(err.response?.data?.error || `Could not ${successLabel.toLowerCase()}.`);
    } finally {
      setUpdatingId(null);
    }
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
        "No student found. Search by YC reference, student index, phone, or name from this roster.",
      );
      setHighlightedId(null);
      return;
    }

    setStatusFilter("all");
    setView("detail");
    setHighlightedId(found.id);
    setSelectedId(found.id);
    setLookupFeedback(`Opened ${found.patientName} (${found.reference}).`);
    requestAnimationFrame(() => {
      document.getElementById(`staff-appt-${found.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  async function handleCallNext(room) {
    setBusyRoomId(room.id || room._id);
    setMessage("");
    try {
      const result = await callNextPatient({ roomId: room.id || room._id });
      setMessage(
        result.appointment
          ? result.message || `Called next patient to ${room.name}.`
          : result.message || `No waiting patients for ${room.name}.`,
      );
      await reload();
    } catch (err) {
      setMessage(err.response?.data?.error || `Could not call next for ${room.name}.`);
    } finally {
      setBusyRoomId("");
    }
  }

  async function handleComplete(id) {
    setUpdatingId(id);
    try {
      await advanceQueue({ appointmentId: id });
      await reload();
      setMessage("Visit completed.");
    } catch (err) {
      setMessage(err.response?.data?.error || "Could not complete this visit.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkNoShow(id) {
    setUpdatingId(id);
    setMessage("");
    try {
      await markQueueNoShow({ appointmentId: id });
      setMessage("Marked no-show. Slot released.");
      await reload();
      return true;
    } catch (err) {
      setMessage(err.response?.data?.error || "Could not mark no-show.");
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  const selectedAppointment = appointments.find((appt) => appt.id === selectedId) || null;

  const filteredAppointments = appointments
    .filter((appt) => matchesDeskQuery(appt, deskQuery))
    .filter((appt) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "WALK_IN") return appt.bookingType === "WALK_IN";
      return appt.status === statusFilter;
    });

  if (staff?.role === "DOCTOR") {
    return (
      <>
        <StaffWorkstationBar staff={staff} onSignOut={logout} />
        <DoctorWorkstation staff={staff} />
      </>
    );
  }

  const canCallNext = staff?.role === "ADMIN" || staff?.role === "DOCTOR";

  return (
    <>
      <StaffWorkstationBar
        staff={staff}
        onSignOut={logout}
        view={view}
        onViewChange={setView}
        arrivedCount={appointments.filter((appt) => appt.status === "CHECKED_IN").length}
      />
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-16 sm:px-8 lg:px-10">
        {view !== "walkin" && (
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-[#173b3a]">
              <span className="font-semibold">Clinic site</span>
              <select
                value={clinicSite}
                onChange={(event) => setClinicSite(event.target.value)}
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
              <span className="font-semibold">Roster date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-xl border border-[#dce8df] bg-white px-3 py-2 text-sm outline-none focus:border-[#176b5f]"
              />
            </label>
            <button
              type="button"
              onClick={() => setSelectedDate(accraTodayIso())}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                isSelectedToday
                  ? "border-[#176b5f] bg-[#176b5f] text-white"
                  : "border-[#dce8df] bg-white text-[#173b3a]"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(SEED_DATE)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                selectedDate === SEED_DATE
                  ? "border-[#176b5f] bg-[#176b5f] text-white"
                  : "border-[#dce8df] bg-white text-[#173b3a]"
              }`}
            >
              Seed day (15 Sep)
            </button>
          </div>
        )}

        {(error || message) && (
          <p
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              error && !usingLive
                ? "bg-[#fff6e8] text-[#8a5a12]"
                : "bg-[#E7F5F1] text-[#176b5f]"
            }`}
          >
            {error && !usingLive ? error : message}
          </p>
        )}

        {view !== "walkin" && (
          <>
            <form
              onSubmit={handleDeskLookup}
              className="mb-5 flex flex-col gap-2.5 rounded-2xl border border-[#dce8df] bg-white p-3.5 sm:flex-row"
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
                className="w-full rounded-xl border border-[#dce8df] px-3 py-2.5 text-sm outline-none focus:border-[#176b5f]"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14594f]"
              >
                Find & open record
              </button>
            </form>
            {lookupFeedback && <p className="mb-4 text-sm text-gray-500">{lookupFeedback}</p>}
          </>
        )}

        {view === "today" && (
          <StaffToday
            appointments={appointments}
            clinicLabel={clinicLabel}
            selectedDateLabel={selectedDateLabel}
            isSelectedToday={isSelectedToday}
            onOpenRoster={() => setView("roster")}
            onOpenQueue={() => setView("queue")}
            onOpenWalkIn={() => setView("walkin")}
            onCheckInToQueue={(id) => applyStatus(id, "WAITING", "Checked into queue")}
            updatingId={updatingId}
            showCorridor={staff?.role === "ADMIN"}
          />
        )}

        {view === "roster" && (
          <StaffRoster
            appointments={appointments}
            filteredAppointments={filteredAppointments}
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
            highlightedId={highlightedId}
            updatingId={updatingId}
            loading={loading}
            onCheckIn={(id) => applyStatus(id, "CHECKED_IN", "Checked in")}
            onCheckInToQueue={(id) => applyStatus(id, "WAITING", "Checked into queue")}
            onNoShow={(id) => {
              setSelectedId(id);
              setView("noshow");
            }}
            onOpenRecord={(id) => {
              setSelectedId(id);
              setHighlightedId(id);
              setView("detail");
            }}
            onOpenWalkIn={() => setView("walkin")}
          />
        )}

        {view === "detail" && (
          <StaffAppointmentDetail
            appointment={selectedAppointment}
            updating={updatingId === selectedAppointment?.id}
            onBack={() => setView("roster")}
            onCheckInToQueue={(id) => applyStatus(id, "WAITING", "Checked into queue")}
            onChangeTime={() => setView("change")}
            onNoShow={() => setView("noshow")}
            onOpenQueue={() => setView("queue")}
          />
        )}

        {view === "change" && (
          <StaffChangeAppointment
            appointment={selectedAppointment}
            onBack={() => setView("detail")}
            onDone={reload}
          />
        )}

        {view === "noshow" && (
          <StaffNoShowConfirm
            appointment={selectedAppointment}
            busy={updatingId === selectedAppointment?.id}
            onBack={() => setView("roster")}
            onConfirm={() => handleMarkNoShow(selectedAppointment.id)}
          />
        )}

        {view === "queue" && (
          <StaffLiveQueue
            appointments={appointments}
            clinicLabel={clinicLabel}
            canCallNext={canCallNext}
            canComplete={staff?.role === "DOCTOR"}
            updatingId={updatingId}
            busyRoomId={busyRoomId}
            rooms={rooms.map((room) => ({
              id: room.id || room._id,
              name: room.name,
            }))}
            onCheckInToQueue={(id) => applyStatus(id, "WAITING", "Checked into queue")}
            onCallNext={handleCallNext}
            onComplete={handleComplete}
            onOpenRoster={() => setView("roster")}
            onOpenWalkIn={() => setView("walkin")}
            showCorridor={staff?.role === "ADMIN"}
          />
        )}

        {view === "walkin" && (
          <StaffWalkIn
            clinicSite={clinicSite}
            onBack={() => setView("queue")}
            onQueued={async () => {
              setSelectedDate(accraTodayIso());
              await reload();
            }}
          />
        )}
      </main>
    </>
  );
};

export default StaffPortal;
