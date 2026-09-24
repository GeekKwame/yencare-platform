export default function AfterHours({ onFindAppointment, onBookHospital, onHome }) {
  return (
    <div className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 text-center shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      <span className="inline-block rounded-full border border-[#D8DCD9] bg-[#F0F2F1] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#66706B]">
        Clinic closed
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#173b3a]">
        Students&apos; Clinic Is Closed
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#66706B]">
        New Students&apos; Clinic bookings are unavailable right now. The clinic
        operates Monday to Friday, 8:00 AM – 4:00 PM.
      </p>

      <div className="mt-6 rounded-2xl border border-[#F8B4B4] bg-[#FDF2F2] p-4 text-left text-xs leading-5 text-[#C53030]">
        <strong className="block text-[#9B2C2C]">For urgent or emergency medical needs</strong>
        Seek care at KNUST Hospital (University Health Services), north-eastern campus
        along the Kumasi–Accra Highway (N6, MCPG+GCX). The hospital is open 24 hours.
        Call +233 32 239 7998.
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-[#D8DCD9] bg-[#F7F8F7] p-4 text-left text-xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#111111]">
          KNUST University Health Services
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#66706B]">KNUST Students&apos; Clinic</span>
          <span className="font-semibold text-[#111111]">Mon–Fri: 8:00 AM – 4:00 PM</span>
        </div>
        <p className="text-[#66706B]">Opposite Hall 7, Africa Hall Road</p>
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[#66706B]">KNUST Hospital</span>
          <span className="font-semibold text-[#111111]">Open 24 hours</span>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={onFindAppointment}
          className="w-full rounded-xl border border-[#dce8df] px-6 py-3.5 text-sm font-semibold text-[#173b3a] hover:bg-[#f5faf7]"
        >
          Find your existing appointment
        </button>
        <button
          type="button"
          onClick={onBookHospital}
          className="w-full rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#14594f]"
        >
          Book at KNUST Hospital (24 hours)
        </button>
        <button
          type="button"
          onClick={onHome}
          className="w-full text-xs font-semibold text-[#176b5f] hover:underline"
        >
          Return to home
        </button>
      </div>
    </div>
  );
}
