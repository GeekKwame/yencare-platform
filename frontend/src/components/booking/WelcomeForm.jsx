import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaClock,
  FaCalendarAlt,
  FaSearch,
  FaArrowRight,
  FaFacebookMessenger,
} from "react-icons/fa";
import Logo from "../../assets/Yencare Logo.png";
import { accraClockLabel, isStudentsClinicOpen } from "../../lib/accraTime";
import FindAppointment from "../appointment/FindAppointment";
import AfterHours from "./AfterHours";
import { getClinicActivity } from "../../services/queue";

const WelcomeForm = ({ onStartBooking, initialReference = "" }) => {
  const [clock, setClock] = useState(() => accraClockLabel());
  const [findAppointment, setFindAppointment] = useState(() => Boolean(initialReference));
  const [afterHours, setAfterHours] = useState(() => !isStudentsClinicOpen());
  const [activity, setActivity] = useState({
    nowServingToken: "—",
    waitingCount: "—",
    estimatedWaitMinutes: null,
  });

  useEffect(() => {
    setClock(accraClockLabel());
    const clockId = window.setInterval(() => setClock(accraClockLabel()), 30000);
    return () => window.clearInterval(clockId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getClinicActivity("students-clinic");
        if (cancelled) return;
        setActivity({
          nowServingToken: data.nowServingToken || "—",
          waitingCount: data.waitingCount ?? 0,
          estimatedWaitMinutes: data.estimatedWaitMinutes ?? 0,
        });
      } catch {
        if (!cancelled) {
          setActivity({
            nowServingToken: "—",
            waitingCount: "—",
            estimatedWaitMinutes: null,
          });
        }
      }
    }

    load();
    const id = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (findAppointment) {
    return (
      <FindAppointment
        setAppointment={setFindAppointment}
        initialReference={initialReference}
      />
    );
  }

  if (afterHours) {
    return (
      <AfterHours
        onFindAppointment={() => {
          setAfterHours(false);
          setFindAppointment(true);
        }}
        onBookHospital={() => onStartBooking({ clinicSite: "knust-hospital" })}
        onHome={() => setAfterHours(false)}
      />
    );
  }

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <img src={Logo} alt="YenCare Logo" className="mt-3 w-14" />

        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <FaClock size={10} className="text-[#176b5f]" />
          <span>{clock} Accra</span>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
          Start your booking
        </p>

        <h2 className="display-font mt-2 text-center text-2xl font-bold leading-tight text-[#173b3a] sm:text-3xl">
          Akwaaba!
        </h2>

        <p className="mt-1.5 max-w-xl text-center text-sm leading-6 text-gray-500">
          Book a visit, find an appointment, or check your queue.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex w-full flex-wrap items-stretch justify-center gap-3 sm:gap-4">
          <div className="flex min-w-[100px] flex-1 flex-col items-center justify-center rounded-lg bg-gray-100 px-3 py-3 sm:min-w-[120px] sm:px-4 sm:py-4">
            <p className="text-center text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:text-xs">
              Now serving
            </p>
            <p className="mt-1 text-xl font-bold text-[#173b3a] sm:text-2xl">
              {activity.nowServingToken}
            </p>
          </div>

          <div className="flex min-w-[100px] flex-1 flex-col items-center justify-center rounded-lg bg-gray-100 px-3 py-3 sm:min-w-[120px] sm:px-4 sm:py-4">
            <p className="text-center text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:text-xs">
              Waiting
            </p>
            <p className="mt-1 text-xl font-bold text-[#173b3a] sm:text-2xl">
              {activity.waitingCount}
            </p>
          </div>

          <div className="flex min-w-[100px] flex-1 flex-col items-center justify-center rounded-lg bg-gray-100 px-3 py-3 sm:min-w-[120px] sm:px-4 sm:py-4">
            <p className="text-center text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:text-xs">
              Estimated wait
            </p>
            <p className="mt-1 text-xl font-bold text-[#173b3a] sm:text-2xl">
              {activity.estimatedWaitMinutes == null
                ? "—"
                : activity.estimatedWaitMinutes === 0
                  ? "—"
                  : `~${activity.estimatedWaitMinutes}m`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isStudentsClinicOpen()) {
              setAfterHours(true);
              return;
            }
            onStartBooking();
          }}
          className="group flex w-full cursor-pointer items-center gap-3 rounded-full bg-[#176b5f] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(23,107,95,0.15)] transition duration-300 hover:bg-[#12584f]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
            <FaCalendarAlt size={13} />
          </span>

          <span>Book an available appointment</span>

          <FaArrowRight
            size={12}
            className="ml-auto transition-transform duration-300 group-hover:translate-x-1"
          />
        </button>

        <button
          type="button"
          onClick={() => setFindAppointment(true)}
          className="group flex w-full cursor-pointer items-center gap-3 rounded-full border border-[#d5dfda] bg-white px-5 py-3.5 text-sm font-bold text-[#173b3a] transition duration-300 hover:border-[#176b5f] hover:bg-[#f5faf7] hover:text-[#176b5f]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf5ed] text-[#176b5f]">
            <FaSearch size={13} />
          </span>

          <span>Find my appointment</span>

          <FaArrowRight
            size={12}
            className="ml-auto opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
          />
        </button>

        <div className="flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-[#e6eee9]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Queue</span>
          <div className="h-px flex-1 bg-[#e6eee9]" />
        </div>

        <div className="rounded-2xl border border-[#dce8df] bg-[#f5faf7] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#176b5f] shadow-sm">
              <FaClock size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#176b5f]">
                Live updates
              </p>
              <h3 className="mt-0.5 text-sm font-bold text-[#173b3a]">Live clinic queue</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                See queue activity and know when your turn is next.
              </p>
            </div>

            <Link
              to="/clinic-activity"
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#176b5f] px-4 py-2.5 text-[10px] font-bold text-[#176b5f] transition duration-300 hover:bg-[#176b5f] hover:text-white"
            >
              View
              <FaArrowRight size={9} />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-[#fffaf2] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#c37d32] shadow-sm">
              <FaClock size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c37d32]">
                Already checked in?
              </p>
              <h3 className="mt-0.5 text-sm font-bold text-[#173b3a]">
                Check your queue position
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Check your queue token and current position.
              </p>
            </div>

            <Link
              to="/queue"
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#173b3a] px-4 py-2.5 text-[10px] font-bold text-white transition duration-300 hover:bg-[#176b5f]"
            >
              Check
              <FaArrowRight size={9} />
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-2.5 border-t border-[#edf1ee] pt-4 text-[11px] leading-5 text-gray-400">
          <FaFacebookMessenger size={13} className="mt-0.5 shrink-0 text-[#176b5f]" />
          <p>
            We&apos;ll send a confirmation message after you book. Standard messaging rates may apply depending on your carrier in Ghana.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WelcomeForm;
