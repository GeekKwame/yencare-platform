import { useCallback, useEffect, useState } from "react";
import { FaSearch, FaUsers } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { isValidGhanaPhone } from "../data/bookingOptions";
import {
  mapAppointment,
  normalizeReference,
  QUEUE_STEPS,
  REFERENCE_PATTERN,
} from "../lib/appointmentView";
import { getQueueStatus, lookupAppointment } from "../services/appointments";

const POLL_MS = 15000;

function ordinal(n) {
  const value = Number(n);
  if (!Number.isFinite(value) || value <= 0) return "at the front";
  const rounded = Math.trunc(value);
  const suffix =
    rounded % 10 === 1 && rounded % 100 !== 11
      ? "st"
      : rounded % 10 === 2 && rounded % 100 !== 12
        ? "nd"
        : rounded % 10 === 3 && rounded % 100 !== 13
          ? "rd"
          : "th";
  return `${rounded}${suffix}`;
}

const Queue = () => {
  const [params, setParams] = useSearchParams();
  const initialRef = normalizeReference(params.get("ref") || "");
  const [mode, setMode] = useState(initialRef ? "reference" : "reference");
  const [searchValue, setSearchValue] = useState(initialRef);
  const [error, setError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [queue, setQueue] = useState(null);
  const [pollError, setPollError] = useState("");

  const reference = appointment?.referenceCode || "";

  const refreshQueue = useCallback(async (ref, { silent } = {}) => {
    if (!ref) return;
    try {
      const status = await getQueueStatus(ref);
      setQueue(status);
      setPollError("");
    } catch (err) {
      if (!silent) {
        setPollError(
          err.response?.data?.error ||
            "Could not refresh queue status. Retrying…",
        );
      } else {
        setPollError("Connection issue. Retrying in 15 seconds…");
      }
    }
  }, []);

  const handleLookup = async (e) => {
    e?.preventDefault();
    setError("");

    let query;
    if (mode === "reference") {
      const referenceCode = normalizeReference(searchValue);
      if (!REFERENCE_PATTERN.test(referenceCode)) {
        setError("Enter a valid reference code (e.g. YC-4821).");
        return;
      }
      query = { reference: referenceCode };
    } else if (!isValidGhanaPhone(searchValue)) {
      setError("Enter a valid Ghana phone number (e.g. 024 123 4567).");
      return;
    } else {
      query = { phone: searchValue.trim() };
    }

    setIsLookingUp(true);
    try {
      const found = await lookupAppointment(query);
      setAppointment(found);
      const ref = found.referenceCode;
      setParams({ ref }, { replace: true });
      await refreshQueue(ref);
    } catch (err) {
      setAppointment(null);
      setQueue(null);
      setError(
        err.response?.status === 404
          ? "Appointment not found. Please check your details and try again."
          : err.response?.data?.error || "Unable to connect to the server.",
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  useEffect(() => {
    if (!initialRef || !REFERENCE_PATTERN.test(initialRef)) return undefined;
    let cancelled = false;

    (async () => {
      setIsLookingUp(true);
      try {
        const found = await lookupAppointment({ reference: initialRef });
        if (cancelled) return;
        setAppointment(found);
        await refreshQueue(initialRef);
      } catch {
        if (!cancelled) {
          setError("Appointment not found. Search again with your YC code or phone.");
        }
      } finally {
        if (!cancelled) setIsLookingUp(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialRef, refreshQueue]);

  useEffect(() => {
    if (!reference) return undefined;
    const id = window.setInterval(() => {
      void refreshQueue(reference, { silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [reference, refreshQueue]);

  const view = appointment ? mapAppointment(appointment) : null;
  const status = queue?.status || view?.status || "";
  const statusIdx = QUEUE_STEPS.findIndex((step) => step.key === status);
  const token = queue?.queueToken || view?.queueToken;
  const roomLabel = queue?.room?.name || view?.room || "Room";
  const clinicianName = queue?.clinician?.name || view?.clinician;
  const nowServing = queue?.nowServingToken || queue?.roomToken;
  const patientsAhead = queue?.patientsAhead ?? null;
  const waitMins = queue?.estimatedWaitMinutes ?? null;
  const position = queue?.position;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-3xl flex-col px-5 pb-16 pt-28 sm:px-8">
      {!appointment ? (
        <section className="rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dcebe1] text-xl text-[#176b5f]">
            <FaUsers />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]">
            Live queue
          </p>
          <h1 className="display-font mt-3 text-3xl font-bold text-[#173b3a] sm:text-4xl">
            Know your place in line.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#607672]">
            Enter your YC reference or the phone number on your booking to see
            your token, wait time, and who is being served.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#f5faf7] p-1.5">
            {[
              { id: "reference", label: "YC Reference" },
              { id: "phone", label: "Phone Number" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setError("");
                }}
                className={`rounded-xl px-3 py-3 text-sm font-bold ${
                  mode === tab.id
                    ? "bg-[#176b5f] text-white"
                    : "text-[#55706c] hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLookup} className="mt-6">
            <label htmlFor="queue-search" className="text-sm font-bold text-[#173b3a]">
              {mode === "reference" ? "Appointment Reference Code" : "Ghana Phone Number"}
            </label>
            <input
              id="queue-search"
              value={searchValue}
              onChange={(e) =>
                setSearchValue(
                  mode === "reference" ? e.target.value.toUpperCase() : e.target.value,
                )
              }
              className="mt-2 w-full rounded-xl border border-[#cbdcd3] bg-[#fbfdfc] px-4 py-3 text-sm text-[#173b3a] outline-none focus:border-[#176b5f] focus:ring-4 focus:ring-[#176b5f]/10"
              placeholder={mode === "reference" ? "e.g. YC-4821" : "e.g. 024 123 4567"}
            />
            {error && (
              <p className="mt-2 text-xs text-red-500" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isLookingUp}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:opacity-70"
            >
              <FaSearch size={13} />
              {isLookingUp ? "Looking up…" : "Check queue"}
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
          <div className="flex items-center justify-between border-b border-[#e5e7e6] pb-4">
            <button
              type="button"
              onClick={() => {
                setAppointment(null);
                setQueue(null);
                setParams({});
              }}
              className="text-sm font-semibold text-[#607672] hover:text-[#173b3a]"
            >
              New search
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#607672]">
              Live Queue · 15s refresh
            </span>
          </div>

          <div className="mt-6 flex items-center justify-between">
            {QUEUE_STEPS.map((step, index) => {
              const isActive = index === statusIdx;
              const isPast = statusIdx > index;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${
                        isPast
                          ? "bg-[#176b5f] text-white"
                          : isActive
                            ? "bg-[#173b3a] text-white"
                            : "border border-[#dce8df] bg-[#f0f2f1] text-[#8a948f]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`mt-1 text-center text-[9px] font-bold uppercase tracking-wider ${
                        isActive ? "text-[#173b3a]" : "text-[#8a948f]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < QUEUE_STEPS.length - 1 && (
                    <div
                      className={`mb-4 h-0.5 flex-1 ${isPast ? "bg-[#176b5f]" : "bg-[#e5e7e6]"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {pollError && (
            <p className="mt-4 rounded-xl border border-[#fcd34d] bg-[#fef7ed] px-3 py-2 text-xs text-[#92400e]">
              {pollError}
            </p>
          )}

          <p className="mt-6 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
            {view.clinic}
          </p>

          {status === "CALLED" ? (
            <div className="mt-3 animate-pulse rounded-2xl border-2 border-[#176b5f] bg-[#e7f5f1] p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#176b5f]">
                It&apos;s your turn
              </p>
              <p className="mt-2 font-mono text-5xl font-bold text-[#173b3a]">
                {token || view.referenceCode}
              </p>
              <h2 className="mt-3 text-lg font-bold text-[#173b3a]">{view.fullName}</h2>
              <p className="mt-1 text-sm font-semibold text-[#176b5f]">
                Please proceed to {roomLabel}
              </p>
              <p className="mt-1 text-xs text-[#607672]">
                {clinicianName} is ready for you.
              </p>
            </div>
          ) : status === "WAITING" ? (
            <div className="mt-3 rounded-2xl border border-[#fcd34d] bg-[#fef7ed] p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#b7791f]">
                Your queue token
              </p>
              <p className="mt-2 font-mono text-5xl font-bold text-[#173b3a]">
                {token || "Pending"}
              </p>
              <h2 className="mt-3 text-lg font-bold text-[#173b3a]">{view.fullName}</h2>
              <div className="mt-4 flex items-center justify-center gap-6 border-t border-[#fcd34d]/40 pt-4">
                <div>
                  <p className="font-mono text-2xl font-bold text-[#b7791f]">
                    {patientsAhead ?? "—"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#607672]">
                    Ahead
                  </p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-bold text-[#b7791f]">
                    ~{waitMins ?? 15}m
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#607672]">
                    Est. wait
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-[#78350f]">
                {position
                  ? `You are ${ordinal(position)} in line`
                  : "You are in the live queue"}
                {nowServing ? ` · Now serving ${nowServing}` : ""}
              </p>
              {patientsAhead >= 2 ? (
                <p className="mt-3 text-left text-xs leading-5 text-[#066a5a]">
                  You can wait nearby. Come back when 1 person remains. We will also text you.
                </p>
              ) : patientsAhead === 1 ? (
                <p className="mt-3 text-left text-xs leading-5 text-[#78350f]">
                  You&apos;re next. Please return to the clinic waiting area.
                </p>
              ) : (
                <p className="mt-3 text-left text-xs leading-5 text-[#78350f]">
                  You&apos;re at the front of the queue. Stay at the clinic — you will be called next.
                </p>
              )}
            </div>
          ) : status === "CHECKED_IN" ? (
            <div className="mt-3 rounded-2xl border border-[#99d5c8] bg-[#e7f5f1] p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#176b5f]">
                Arrived · awaiting reception
              </p>
              <h2 className="mt-2 text-lg font-bold text-[#173b3a]">
                Reception will add you to the queue
              </h2>
              <p className="mt-2 text-sm text-[#607672]">
                Present {view.referenceCode} at the desk. Staff check-in assigns your live token.
              </p>
            </div>
          ) : status === "COMPLETED" ? (
            <div className="mt-3 rounded-2xl border border-[#99d5c8] bg-[#e7f5f1] p-6 text-center">
              <h2 className="text-lg font-bold text-[#173b3a]">Visit completed</h2>
              <p className="mt-1 text-sm text-[#607672]">Your consultation is complete. Take care.</p>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-[#dce8df] bg-[#f0f2f1] p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Booked · not arrived
              </p>
              <h2 className="mt-2 text-lg font-bold text-[#173b3a]">
                Queue position pending check-in
              </h2>
              <p className="mt-2 text-sm text-[#607672]">
                Personal queue numbers are assigned when reception checks you in.
                You do not have a queue number yet.
              </p>
              {nowServing && (
                <p className="mt-3 text-sm font-semibold text-[#173b3a]">
                  Clinic is now serving {nowServing}
                </p>
              )}
            </div>
          )}

          <div className="mt-5 divide-y divide-[#e5e7e6] overflow-hidden rounded-2xl border border-[#dce8df] text-sm">
            <div className="flex justify-between bg-[#f7f8f7] px-4 py-3">
              <span className="text-[#607672]">Clinician</span>
              <span className="font-semibold text-[#173b3a]">{clinicianName}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[#607672]">Room</span>
              <span className="font-semibold text-[#173b3a]">{roomLabel}</span>
            </div>
            <div className="flex justify-between bg-[#f7f8f7] px-4 py-3">
              <span className="text-[#607672]">Scheduled time</span>
              <span className="font-semibold text-[#173b3a]">{view.timeLabel}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[#607672]">Reference</span>
              <span className="font-semibold text-[#173b3a]">{view.referenceCode}</span>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default Queue;
