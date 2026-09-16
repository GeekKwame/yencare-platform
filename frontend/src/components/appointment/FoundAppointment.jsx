import { useState } from "react";
import { IoMdCloseCircle } from "react-icons/io";
import { Link } from "react-router-dom";

const FoundAppointment = ({ formData = {} }) => {
  const patientInfo = [
    { id: 1, label: "Patient", name: formData.fullName },
    { id: 2, label: "Student Index", name: formData.studentIndex },
    { id: 3, label: "Phone", name: formData.phoneNumber },
    { id: 4, label: "Clinician", name: formData.clinician },
    { id: 5, label: "Date", name: formData.appointmentDate },
    { id: 6, label: "Time", name: formData.appointmentTime },
    { id: 7, label: "Clinic", name: formData.clinic },
    { id: 8, label: "Visit Type", name: formData.service },
  ];

  const [cancelledAppointment, setCancelledAppointment] = useState(false);

  return (
    <section className="w-full  sm:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32] text-center">
        KNUST STUDENTS'CLINIC
      </p>

      <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a] sm:text-3xl text-center">
        Your Appointment
      </h2>
      {/* div for reference code */}
      <div className="bg-gray-100 w-full p-5 mt-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
          Appointment Reference Code
        </p>
        <h1 className="text-3xl font-bold ">YC-4821</h1>
        <p className="text-gray-400 text-sm">
          Show this reference code when you arrive at the reception desk
        </p>
      </div>

      {/* Patient's details */}
      <div className="mt-5 text-sm space-y-5 ">
        {patientInfo.map((info) => (
          <div key={info.id} className="flex  justify-between items-center">
            <p>{info.label}</p>
            <p className="font-bold">{info.name}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-3 md:flex-row">
        <Link
          to="/queue"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#14594f] focus:outline-none focus:ring-4 focus:ring-[#176b5f]/15"
        >
          Check Queue
        </Link>

        <button
          onClick={() => setCancelledAppointment(true)}
          type="button"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3.5 text-sm font-semibold text-red-600 transition duration-300 hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-500/10"
        >
          <IoMdCloseCircle size={19} />
          Cancel Appointment
        </button>
      </div>

      {/* Modal */}
      {cancelledAppointment && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#173b3a]/50 px-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#dce8df] bg-white p-7 shadow-[0_25px_70px_rgba(23,59,58,0.18)] sm:p-8">
            {/* <IoMdCloseCircle onClick={() => setCancelledAppointment(false)} size={24} className="ml-auto text-red-400 hover:text-red-500 cursor-pointer" /> */}

            {/* Icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f4ed]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#176b5f] text-white">
                ✓
              </div>
            </div>

            {/* Content */}
            <div className="mt-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
                Appointment Update
              </p>

              <h3 className="display-font mt-2 text-2xl font-bold text-[#173b3a]">
                Appointment Cancelled
              </h3>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#607672]">
                Your appointment has been successfully cancelled. You can book a
                new appointment whenever you're ready.
              </p>
            </div>

            {/* Button */}
            <Link to="/">
              <button
                onClick={() => setCancelledAppointment(false)}
                type="button"
                className="mt-7 w-full cursor-pointer rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#14594f] focus:outline-none focus:ring-4 focus:ring-[#176b5f]/15"
              >
                Close
              </button>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default FoundAppointment;
