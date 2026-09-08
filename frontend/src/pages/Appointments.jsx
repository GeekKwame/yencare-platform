import {
  FaClock,
  FaCalendarAlt,
  FaCheckCircle,
  FaSearch,
  FaArrowRight,
  FaFacebookMessenger,
} from "react-icons/fa";

const Appointments = () => {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col items-center px-5 pb-16 pt-28 sm:px-8 lg:px-10">
      <div className="flex w-full max-w-3xl flex-col gap-10">

        {/* ================= INTRO ================= */}
        <section className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dcebe1] text-xl text-[#176b5f]">
            <FaCalendarAlt />
          </span>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]">
            Appointments
          </p>

          <h1 className="display-font mt-3 text-4xl font-bold leading-tight text-[#173b3a] sm:text-5xl">
            Find time for your care.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#607672] sm:text-base">
            Tell us what you need and we&apos;ll help you find the right
            facility, provider, and time.
          </p>

          {/* Benefits */}
          <div className="mx-auto mt-6 flex max-w-lg flex-col gap-2.5 text-left text-sm font-semibold text-[#55706c]">
            <p className="flex items-center gap-3">
              <FaCheckCircle className="shrink-0 text-[#176b5f]" />
              Compare available appointment times
            </p>

            <p className="flex items-center gap-3">
              <FaCheckCircle className="shrink-0 text-[#176b5f]" />
              Keep your booking details in one place
            </p>

            <p className="flex items-center gap-3">
              <FaCheckCircle className="shrink-0 text-[#176b5f]" />
              Track your queue after you book
            </p>
          </div>
        </section>

        {/* ================= BOOKING CARD ================= */}
        <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
                Start your booking
              </p>

              <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a]">
                Welcome to YenCare
              </h2>

              <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-500">
                Book a visit, find an appointment, or check your queue.
              </p>
            </div>

           
          </div>

          <form className="mt-6 space-y-4">

            {/* ================= BOOK APPOINTMENT ================= */}
            <button
              type="button"
              className="group flex w-full cursor-pointer items-center gap-3 rounded-full bg-[#176b5f] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(23,107,95,0.15)] transition duration-300 hover:bg-[#12584f]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <FaCalendarAlt size={13} />
              </span>

              <span>Book an available appointment</span>

              <FaArrowRight
                size={12}
                className="ml-auto transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>

            {/* ================= FIND APPOINTMENT ================= */}
            <button
              type="button"
              className="group flex w-full cursor-pointer items-center gap-3 rounded-full border border-[#d5dfda] bg-white px-5 py-3.5 text-sm font-bold text-[#173b3a] transition duration-300 hover:border-[#176b5f] hover:bg-[#f5faf7] hover:text-[#176b5f]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf5ed] text-[#176b5f]">
                <FaSearch size={13} />
              </span>

              <span>Find my appointment</span>

              <FaArrowRight
                size={12}
                className="ml-auto opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
              />
            </button>

            {/* ================= QUEUE DIVIDER ================= */}
            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-[#e6eee9]" />

              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
                Queue
              </span>

              <div className="h-px flex-1 bg-[#e6eee9]" />
            </div>

            {/* ================= LIVE QUEUE ================= */}
            <div className="rounded-2xl border border-[#dce8df] bg-[#f5faf7] p-5">
              <div className="flex items-center gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#176b5f] shadow-sm">
                  <FaClock size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#176b5f]">
                    Live updates
                  </p>

                  <h3 className="mt-0.5 text-sm font-bold text-[#173b3a]">
                    Live clinic queue
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    See queue activity and know when your turn is next.
                  </p>
                </div>

                <button
                  type="button"
                  className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#176b5f] px-4 py-2.5 text-[10px] font-bold text-[#176b5f] transition duration-300 hover:bg-[#176b5f] hover:text-white"
                >
                  View
                  <FaArrowRight size={9} />
                </button>
              </div>
            </div>

            {/* ================= ASSIGNED QUEUE ================= */}
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

                <button
                  type="button"
                  className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#173b3a] px-4 py-2.5 text-[10px] font-bold text-white transition duration-300 hover:bg-[#176b5f]"
                >
                  Check
                  <FaArrowRight size={9} />
                </button>
              </div>
            </div>

            {/* ================= CONFIRMATION ================= */}
            <div className="flex items-start gap-2.5 border-t border-[#edf1ee] pt-4 text-[11px] leading-5 text-gray-400">
              <FaFacebookMessenger
                size={13}
                className="mt-0.5 shrink-0 text-[#176b5f]"
              />

              <p>
                We&apos;ll send a confirmation message after you book.
                Standard messaging rates may apply depending on your carrier
                in Ghana.
              </p>
            </div>

          </form>
        </section>
      </div>
    </main>
  );
};

export default Appointments;