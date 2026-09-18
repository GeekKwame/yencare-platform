import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaClock,
  FaSearch,
} from "react-icons/fa";
import { MdAnalytics, MdArrowForward, MdSchedule, MdSms } from "react-icons/md";
import Logo from "../assets/Yencare Logo.png";
import { accraClockLabel, isStudentsClinicOpen } from "../lib/accraTime";
import {
  mapAppointment,
  readLastBookingReference,
} from "../lib/appointmentView";
import { lookupAppointment } from "../services/appointments";
import { getClinicActivity } from "../services/queue";
import { Button, StatusBadge } from "./ui";

const LIVE_STATUSES = new Set(["BOOKED", "CHECKED_IN", "WAITING", "CALLED"]);

function waitLabel(minutes) {
  if (minutes == null || minutes === 0) return "—";
  return `~${minutes}m`;
}

export default function Hero() {
  const clinicOpen = isStudentsClinicOpen();
  const [clock, setClock] = useState(() => accraClockLabel());
  const [activity, setActivity] = useState({
    nowServingToken: "—",
    waitingCount: "—",
    estimatedWaitMinutes: null,
  });
  const [activityError, setActivityError] = useState("");
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    setClock(accraClockLabel());
    const id = window.setInterval(() => setClock(accraClockLabel()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      try {
        const data = await getClinicActivity("students-clinic");
        if (cancelled) return;
        setActivity({
          nowServingToken: data.nowServingToken || "—",
          waitingCount: data.waitingCount ?? 0,
          estimatedWaitMinutes: data.estimatedWaitMinutes ?? 0,
        });
        setActivityError("");
      } catch {
        if (!cancelled) {
          setActivityError("Live clinic numbers could not be loaded.");
        }
      }
    }

    loadActivity();
    const id = window.setInterval(loadActivity, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const ref = readLastBookingReference();
    if (!ref) return undefined;
    let cancelled = false;

    lookupAppointment({ reference: ref })
      .then((found) => {
        if (cancelled) return;
        const view = mapAppointment(found);
        if (LIVE_STATUSES.has(view.status)) setAppointment(found);
      })
      .catch(() => {
        if (!cancelled) setAppointment(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const view = appointment ? mapAppointment(appointment) : null;
  const isLive = view && LIVE_STATUSES.has(view.status);
  const bookTo = clinicOpen ? "/appointments?book=1" : "/appointments";

  return (
    <section className="mx-auto max-w-7xl px-5 pb-12 pt-28 sm:px-8 sm:pb-16 lg:px-10 lg:pb-20">
      <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div>
          <div className="flex items-center gap-3">
            <img src={Logo} alt="" className="h-12 w-12 object-contain" />
            <p className="type-label-micro text-text-muted">KNUST Students&apos; Clinic</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <FaClock size={11} className="text-accent" aria-hidden="true" />
            <span>{clock} Accra</span>
            <span
              className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                clinicOpen
                  ? "border-accent-border bg-accent-soft text-accent"
                  : "border-warning-border bg-warning-soft text-warning"
              }`}
            >
              Students&apos; Clinic {clinicOpen ? "open" : "closed"}
            </span>
          </div>

          <h1 className="display-font mt-5 text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl">
            Akwaaba
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-text-muted sm:text-lg">
            Healthcare access for KNUST students. Book a visit, find an existing
            appointment, or check the live queue from your phone.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:max-w-md">
            <Button as={Link} to={bookTo} variant="primary" size="lg" fullWidth icon={<FaCalendarAlt size={14} />}>
              Book an appointment
            </Button>
            <Button
              as={Link}
              to="/appointments?find=1"
              variant="secondary"
              size="lg"
              fullWidth
              icon={<FaSearch size={14} />}
            >
              Find my appointment
            </Button>
          </div>

          <p className="mt-8 flex max-w-lg items-start gap-2.5 text-xs leading-5 text-text-muted">
            <MdSms size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            We send a confirmation text after you book. Standard rates may apply
            depending on your carrier in Ghana.
          </p>
        </div>

        <div className="card-clinical bg-surface p-5 sm:p-7">
          <div className="grid grid-cols-3 gap-2 text-left">
            <div className="border border-clinic-border bg-clinic-bg p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Now serving
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-primary">
                {activity.nowServingToken}
              </p>
            </div>
            <div className="border border-clinic-border bg-clinic-bg p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Waiting
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-primary">
                {activity.waitingCount}
              </p>
            </div>
            <div className="border border-clinic-border bg-clinic-bg p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Est. wait
              </p>
              <p className="mt-0.5 text-lg font-bold text-primary">
                {waitLabel(activity.estimatedWaitMinutes)}
              </p>
            </div>
          </div>

          {activityError ? (
            <p className="mt-3 border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning" role="status">
              {activityError}
            </p>
          ) : null}

          {isLive && view ? (
            <div className="mt-4 border border-clinic-border bg-clinic-bg p-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Your appointment today
                  </p>
                  <p className="mt-1 text-sm font-bold text-primary">{view.fullName}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {view.clinic} · {view.timeLabel} · {view.referenceCode}
                  </p>
                </div>
                <StatusBadge status={view.status} token={view.queueToken} size="sm" />
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  as={Link}
                  to={
                    view.status === "BOOKED"
                      ? `/appointments?ref=${encodeURIComponent(view.referenceCode)}`
                      : `/queue?ref=${encodeURIComponent(view.referenceCode)}`
                  }
                  variant="accent"
                  size="sm"
                  fullWidth
                >
                  {view.status === "BOOKED"
                    ? "Manage / I've arrived"
                    : view.status === "CHECKED_IN"
                      ? "Waiting for reception"
                      : "Open live queue"}
                </Button>
                <Button
                  as={Link}
                  to={`/appointments?ref=${encodeURIComponent(view.referenceCode)}`}
                  variant="secondary"
                  size="sm"
                  fullWidth
                >
                  View details
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 border border-accent-border bg-accent-soft/50 p-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                  <MdAnalytics size={16} aria-hidden="true" />
                  Live clinic queue activity
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  See who is being served, how many are waiting, and estimated wait
                  before you head to the clinic.
                </p>
              </div>
              <Button as={Link} to="/clinic-activity" variant="accent" size="sm" className="shrink-0">
                View activity
              </Button>
            </div>
          </div>

          <div className="mt-3 border border-clinic-border bg-surface-secondary p-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <MdSchedule size={16} className="text-accent" aria-hidden="true" />
                  Already in the live queue?
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Check your assigned token and live position after reception check-in.
                </p>
              </div>
              <Button
                as={Link}
                to={isLive && view ? `/queue?ref=${encodeURIComponent(view.referenceCode)}` : "/queue"}
                variant="secondary"
                size="sm"
                className="shrink-0"
                icon={<MdArrowForward size={16} />}
                iconPosition="right"
              >
                Check queue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
