import { useState } from "react";
import { mockAppointments } from "../data/mockAppointments";

const StaffPortal = () => {
  const [appointments, setAppointments] = useState(mockAppointments);

  function handleCheckIn(id) {
    setAppointments((prev) =>
      prev.map((appt) =>
        appt.id === id ? { ...appt, status: "CHECKED_IN" } : appt
      )
    );
  }

  return (
      <main className="mx-auto max-w-5xl px-5 pt-22 pb-16 sm:px-8 lg:px-10">
      <h1 className="text-3xl font-bold text-[#173b3a] mb-1">Today's Appointments</h1>
      <p className="text-sm text-gray-500 mb-6">KNUST Main Clinic · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {appointments.map((appt) => (
          <div
            key={appt.id}
            className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-[0_14px_30px_rgba(23,59,58,0.07)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-[#c37d32]">
                {appt.reference}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  appt.status === "CHECKED_IN"
                    ? "bg-[#176b5f] text-white"
                    : "bg-[#dce8df] text-[#173b3a]"
                }`}
              >
                {appt.status}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-bold text-[#173b3a]">{appt.patientName}</h3>
            <p className="mt-1 text-sm text-gray-500">{appt.service} · {appt.time}</p>

            {appt.status === "BOOKED" && (
              <button
                onClick={() => handleCheckIn(appt.id)}
                className="mt-4 w-full rounded-xl bg-[#176b5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14594f]"
              >
                Check In
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
};

export default StaffPortal;