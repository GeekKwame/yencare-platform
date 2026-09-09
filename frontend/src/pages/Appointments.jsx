import {
  FaCalendarAlt,
  FaCheckCircle,
} from "react-icons/fa";
import BookingForm from "../components/booking/BookingForm";

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

      </div>



<div className="mt-12">
<BookingForm/>

</div>


    </main>
  );
};

export default Appointments;