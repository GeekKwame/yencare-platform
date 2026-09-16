import { useState } from "react";
import {
  FaArrowLeft,
  FaHashtag,
  FaIdCard,
  FaPhone,
  FaSearch,
} from "react-icons/fa";
import FoundAppointment from "./FoundAppointment";

const FindAppointment = ({ setAppointment }) => {
  const [searchMethod, setSearchMethod] = useState("reference");
  const [searchInput, setSearchInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [appointmentFound, setAppointmentFound] = useState(false);

  const methods = [
    {
      id: "reference",
      label: "YC Reference",
      icon: FaHashtag,
    },
    {
      id: "studentId",
      label: "Student Index",
      icon: FaIdCard,
    },
    {
      id: "phone",
      label: "Phone Number",
      icon: FaPhone,
    },
  ];

  const searchDetails = {
    reference: {
      label: "Appointment Reference Code",
      placeholder: "e.g. YC-4821",
      hint: "Your reference code was sent via SMS.",
    },
    studentId: {
      label: "Student Index Number",
      placeholder: "e.g. 20612345",
      hint: "Use your KNUST student identification number.",
    },
    phone: {
      label: "Ghana Phone Number",
      placeholder: "e.g. 024 123 4567",
      hint: "We will use this number to find your appointment.",
    },
  };

  const activeSearch = searchDetails[searchMethod];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!searchInput.trim()) {
      setErrorMessage("Please enter a value to search.");
      return;
    }

    if (searchInput.trim().length < 7) {
      setErrorMessage(
        "Your reference code should not be less than 7 characters and should be in the right format."
      );
      return;
    }

    setAppointmentFound(true);
    setSearchInput("");
    setErrorMessage("");
  };

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      {!appointmentFound ? (
        <>
          <button
            onClick={() => setAppointment(false)}
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
          >
            <FaArrowLeft size={11} />
            Back
          </button>

          <div className="mt-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
              Appointment lookup
            </p>

            <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a] sm:text-3xl">
              Find your appointment
            </h2>
          </div>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[#607672]">
            Search using your YC reference, student index number, or phone
            number.
          </p>

          <div
            className="mt-7 grid gap-2 rounded-2xl bg-[#f5faf7] p-1.5 sm:grid-cols-3"
            role="tablist"
          >
            {methods.map(({ id, label, icon: Icon }) => {
              const isActive = searchMethod === id;

              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setSearchMethod(id);
                    setErrorMessage("");
                  }}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold transition sm:text-sm ${
                    isActive
                      ? "bg-[#176b5f] text-white shadow-[0_6px_16px_rgba(23,107,95,0.18)]"
                      : "text-[#55706c] hover:bg-white hover:text-[#176b5f]"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mt-7">
              <label
                htmlFor="appointment-search"
                className="text-sm font-bold text-[#173b3a]"
              >
                {activeSearch.label}
              </label>

              <input
                id="appointment-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#cbdcd3] bg-[#fbfdfc] px-4 py-3 text-sm text-[#173b3a] outline-none transition placeholder:text-[#9aaba5] focus:border-[#176b5f] focus:ring-4 focus:ring-[#176b5f]/10"
                placeholder={activeSearch.placeholder}
              />

              {errorMessage && (
                <p className="mt-2 text-xs text-red-500">
                  {errorMessage}
                </p>
              )}

              <p className="mt-2 text-xs text-[#78908a]">
                {activeSearch.hint}
              </p>
            </div>

            <button
              type="submit"
              className="mt-7 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#14594f]"
            >
              <FaSearch size={13} />
              Find Appointment
            </button>
          </form>
        </>
      ) : (
        <FoundAppointment />
      )}
    </section>
  );
};

export default FindAppointment;