import { FaArrowLeft, FaCalendarAlt } from "react-icons/fa";
import {
  clinicSiteLabel,
  formatDateLabel,
  formatTimeLabel,
} from "../../data/bookingOptions";

const SlotTaken = ({ formData, onChooseAnother, onHome }) => {
  const attempted = [
    formatDateLabel(formData.appointmentDate),
    formatTimeLabel(formData.appointmentTime),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 text-center shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#fcd34d] bg-[#fef7ed] text-[#b7791f]">
        <FaCalendarAlt />
      </div>

      <span className="mt-4 inline-block rounded-full border border-[#fcd34d] bg-[#fef7ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#b7791f]">
        Slot unavailable
      </span>

      <h2 className="display-font mt-3 text-2xl font-bold text-[#173b3a] sm:text-3xl">
        This time slot was just taken
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#607672]">
        Another student confirmed {formatTimeLabel(formData.appointmentTime) || "this time"}{" "}
        while you were completing your booking. Please choose another available
        consultation time at {clinicSiteLabel(formData.clinicSite)}.
      </p>

      <div className="mx-auto mt-6 max-w-md space-y-2 rounded-2xl border border-[#dce8df] bg-[#f7f8f7] p-4 text-left text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-[#607672]">Clinician</span>
          <span className="font-semibold text-[#173b3a]">
            {formData.clinician || "—"}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#607672]">Attempted slot</span>
          <span className="font-semibold text-[#c53030] line-through">
            {attempted || "Selected time"}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#607672]">Status</span>
          <span className="font-medium text-[#b7791f]">Taken by another patient</span>
        </div>
      </div>

      <div className="mx-auto mt-7 flex max-w-md flex-col gap-3">
        <button
          type="button"
          onClick={onChooseAnother}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f]"
        >
          <FaCalendarAlt size={12} />
          Choose another time
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce8df] px-6 py-3.5 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
        >
          <FaArrowLeft size={11} />
          Return to start
        </button>
      </div>
    </section>
  );
};

export default SlotTaken;
