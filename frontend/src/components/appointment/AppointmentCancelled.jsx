import { Link } from "react-router-dom";

const AppointmentCancelled = ({ appointment, onHome }) => {
  const reference =
    appointment?.referenceCode || appointment?.id || "this appointment";

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 text-center shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#dce8df] bg-[#f5faf7] text-[#607672]">
        ✕
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
        Cancelled
      </p>
      <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a] sm:text-3xl">
        Appointment Cancelled
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#607672]">
        Your appointment reference{" "}
        <strong className="text-[#173b3a]">{reference}</strong> has been
        cancelled and the slot was released.
      </p>
      <div className="mt-6 rounded-2xl border border-[#dce8df] bg-[#f5faf7] p-4 text-left text-sm leading-6 text-[#607672]">
        A cancellation confirmation message has been sent to your phone. If you
        need care, you can book a new consultation at any time.
      </div>
      <div className="mt-7 flex flex-col gap-3">
        <Link
          to="/appointments"
          className="flex w-full items-center justify-center rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f]"
        >
          Book new appointment
        </Link>
        <button
          type="button"
          onClick={onHome}
          className="w-full cursor-pointer rounded-xl border border-[#dce8df] px-6 py-3.5 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
        >
          Return to Home
        </button>
      </div>
    </section>
  );
};

export default AppointmentCancelled;
