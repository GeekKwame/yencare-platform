import { useEffect, useMemo, useState } from "react";
import StaffLiveQueue from "../components/staff/StaffLiveQueue";
import StaffRoster from "../components/staff/StaffRoster";
import StaffToday from "../components/staff/StaffToday";
import StaffWalkIn from "../components/staff/StaffWalkIn";
import StaffAppointmentDetail from "../components/staff/StaffAppointmentDetail";
import StaffChangeAppointment from "../components/staff/StaffChangeAppointment";
import StaffNoShowConfirm from "../components/staff/StaffNoShowConfirm";
import { matchesDeskQuery } from "../components/staff/staffUtils";
import StaffLayout from "../components/staff/StaffLayout";
import { useStaffAuth } from "../context/StaffAuthContext";
import { useToast } from "../components/ui";
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

const StaffPortal = () => {
  const { staff, logout } = useStaffAuth();
  const toast = useToast();
  const [clinicSite, setClinicSite] = useState(staff?.clinicSite || DEFAULT_CLINIC_SITE);
  const [selectedDate, setSelectedDate] = useState(() => accraTodayIso());
  const [followToday, setFollowToday] = useState(true);
  const [view, setView] = useState(staff?.role === "DOCTOR" ? "room" : "today");
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

  useEffect(() => {
    if (!followToday) return undefined;
    const syncToday = () => {
      const today = accraTodayIso();
      setSelectedDate((current) => (current === today ? current : today));
    };
    syncToday();
    const id = window.setInterval(syncToday, 30000);
    return () => window.clearInterval(id);
  }, [followToday]);

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
      toast.success(`${successLabel}.`);
      await reload();
    } catch (err) {
      const fail = err.response?.data?.error || `Could not ${successLabel.toLowerCase()}.`;
      setMessage(fail);
      toast.error(fail);
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
      toast.success(
        result.appointment
          ? result.message || `Called next patient to ${room.name}.`
          : result.message || `No waiting patients for ${room.name}.`,
      );
      await reload();
    } catch (err) {
      const fail = err.response?.data?.error || `Could not call next for ${room.name}.`;
      setMessage(fail);
      toast.error(fail);
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
      toast.success("Visit completed.");
    } catch (err) {
      const fail = err.response?.data?.error || "Could not complete this visit.";
      setMessage(fail);
      toast.error(fail);
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
      toast.success("Marked no-show. Slot released.");
      await reload();
      return true;
    } catch (err) {
      const fail = err.response?.data?.error || "Could not mark no-show.";
      setMessage(fail);
      toast.error(fail);
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

  const canCallNext = staff?.role === "ADMIN" || staff?.role === "DOCTOR";
  const arrivedCount = appointments.filter((appt) => appt.status === "CHECKED_IN").length;

  function openLiveQueue() {
    setFollowToday(true);
    setSelectedDate(accraTodayIso());
    setView("queue");
  }

  function handleViewChange(nextView) {
    if (nextView === "queue") {
      openLiveQueue();
      return;
    }
    setView(nextView);
  }

  return (
    <StaffLayout
      staff={staff}
      view={view}
      onViewChange={handleViewChange}
      arrivedCount={arrivedCount}
      onSignOut={logout}
    >
      {view !== "walkin" && view !== "room" && view !== "queue" && (
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
              <span className="font-semibold">Visit date</span>
              <input
                type="date"
                value={selectedDate === "upcoming" ? accraTodayIso() : selectedDate}
                onChange={(event) => {
                  setFollowToday(false);
                  setSelectedDate(event.target.value);
                }}
                className="rounded-xl border border-[#dce8df] bg-white px-3 py-2 text-sm outline-none focus:border-[#176b5f]"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setFollowToday(true);
                setSelectedDate(accraTodayIso());
              }}
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
              onClick={() => {
                setFollowToday(false);
                setSelectedDate("upcoming");
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                selectedDate === "upcoming"
                  ? "border-[#176b5f] bg-[#176b5f] text-white"
                  : "border-[#dce8df] bg-white text-[#173b3a]"
              }`}
            >
              Upcoming (Next 14 Days)
            </button>
          </div>
        )}

        {(message || (error && view !== "roster")) && (
          <div
            className={`mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${
              error && !usingLive
                ? "border border-warning-border bg-warning-soft text-warning"
                : "border border-accent-border bg-accent-soft text-accent"
            }`}
            role="status"
            aria-live="polite"
          >
            <p>{error && !usingLive ? error : message}</p>
            {error && !usingLive && (
              <button
                type="button"
                onClick={() => void reload()}
                className="min-h-11 border border-clinic-border bg-surface px-3 py-2 text-xs font-semibold text-primary"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {view !== "walkin" && view !== "room" && (
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
            onOpenQueue={openLiveQueue}
            onOpenWalkIn={() => setView("walkin")}
            onCheckInToQueue={(id) => applyStatus(id, "WAITING", "Checked into queue")}
            updatingId={updatingId}
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
            error={error && !usingLive ? error : ""}
            onRetry={reload}
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
            onOpenQueue={openLiveQueue}
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
            selectedDate={selectedDate === "upcoming" ? accraTodayIso() : selectedDate}
            selectedDateLabel={selectedDate === "upcoming" ? "Today" : selectedDateLabel}
            error={error}
            usingLive={usingLive}
            canCallNext={canCallNext}
            canComplete={staff?.role === "DOCTOR"}
            updatingId={updatingId}
            busyRoomId={busyRoomId}
            rooms={
              staff?.role === "DOCTOR" && staff?.assignedRoom
                ? rooms
                    .filter(
                      (r) =>
                        String(r.name).toLowerCase() ===
                        String(staff.assignedRoom).toLowerCase(),
                    )
                    .map((room) => ({ id: room.id || room._id, name: room.name }))
                : rooms.map((room) => ({ id: room.id || room._id, name: room.name }))
            }
            onCheckInToQueue={(id) => applyStatus(id, "WAITING", "Checked into queue")}
            onCallNext={handleCallNext}
            onComplete={handleComplete}
            onOpenRoster={() => setView("roster")}
            onOpenWalkIn={() => setView("walkin")}
          />
        )}

        {view === "room" && <DoctorWorkstation staff={staff} />}

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
    </StaffLayout>
  );
};

export default StaffPortal;
